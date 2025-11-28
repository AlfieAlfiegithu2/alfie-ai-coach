import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get user's profile with Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.stripe_customer_id) {
      // No Stripe customer - just update profile to free
      await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'free',
          subscription_expires_at: null
        })
        .eq('id', userId);

      return new Response(
        JSON.stringify({ success: true, message: "Subscription status updated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 10
    });

    if (subscriptions.data.length === 0) {
      // No active subscriptions - just update profile
      await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'free',
          subscription_expires_at: null
        })
        .eq('id', userId);

      return new Response(
        JSON.stringify({ success: true, message: "No active subscription found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel all active subscriptions (at period end to give user remaining time)
    for (const subscription of subscriptions.data) {
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true
      });
      console.log(`Cancelled subscription ${subscription.id} at period end`);
    }

    // Update profile - keep premium status until period ends
    const periodEnd = subscriptions.data[0]?.current_period_end;
    await supabase
      .from('profiles')
      .update({ 
        subscription_expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null
      })
      .eq('id', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Subscription will be cancelled at the end of the billing period",
        expiresAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to cancel subscription" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

