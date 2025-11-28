import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { planId, successUrl, cancelUrl, currency = 'usd' } = await req.json();

    // All prices in USD cents - Stripe will convert to local currency automatically
    const pricing = {
      pro: 4900,    // $49.00 USD
      ultra: 19900, // $199.00 USD
    };

    // Plan configuration
    const planMap: Record<string, { 
      name: string; 
      productId: string;
    }> = {
      premium: { 
        name: "Pro Plan - English AIdol",
        productId: "prod_TVX1yRMBGoFRc4",
      },
      pro: { 
        name: "Pro Plan - English AIdol",
        productId: "prod_TVX1yRMBGoFRc4",
      },
      ultra: { 
        name: "Ultra Plan - English AIdol",
        productId: "prod_TVX1cx1sbChMh6",
      },
    };

    const plan = planMap[planId as string];
    const amount = planId === 'ultra' ? pricing.ultra : pricing.pro;
    
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan. Choose 'pro' or 'ultra'" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeSecret) throw new Error("Stripe secret not configured");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Check if user already has a Stripe customer ID
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create or get Stripe customer
    if (!customerId) {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            supabase_user_id: user.id
          }
        });
        customerId = customer.id;
      }

      // Save customer ID to profile
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Always use one-time payment mode for multi-currency support
    // (Subscriptions require pre-created prices in each currency)
    
    // Create Stripe Checkout Session in USD - Stripe converts to local currency automatically
    const sessionConfig: any = {
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',  // Always USD, Stripe shows converted price to user
            product: plan.productId,
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/dashboard?payment=success&plan=${planId}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pay?plan=${planId}&cancelled=true`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

