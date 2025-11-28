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

    const { planId, successUrl, cancelUrl, paymentMode } = await req.json();

    // Plan configuration matching hero page pricing
    // Each plan has both recurring (subscription) and one-time price IDs
    const planMap: Record<string, { 
      amount: number; 
      name: string; 
      recurringPriceId: string;
      oneTimePriceId?: string;
    }> = {
      // Pro Plan - $49/month
      premium: { 
        amount: 4900, 
        name: "Pro Plan - English AIdol",
        recurringPriceId: "price_1SYVxbCg5LtU404t7ty3ScDP",
        oneTimePriceId: "price_1SYVxbCg5LtU404t7ty3ScDP", // Will create one-time price if needed
      },
      pro: { 
        amount: 4900, 
        name: "Pro Plan - English AIdol",
        recurringPriceId: "price_1SYVxbCg5LtU404t7ty3ScDP",
        oneTimePriceId: "price_1SYVxbCg5LtU404t7ty3ScDP",
      },
      // Ultra Plan - $199/month  
      ultra: { 
        amount: 19900, 
        name: "Ultra Plan - English AIdol",
        recurringPriceId: "price_1SYVxcCg5LtU404tn1up3ilK",
        oneTimePriceId: "price_1SYVxcCg5LtU404tn1up3ilK",
      },
    };

    const plan = planMap[planId as string];
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

    // Determine if user wants subscription (limited payment methods) or one-time (all payment methods)
    const isOneTime = paymentMode === 'one_time';
    
    // For one-time payments, we need to create a one-time price on the fly
    let priceId = plan.recurringPriceId;
    
    if (isOneTime) {
      // Create a one-time price for this product
      const productId = plan.recurringPriceId.includes('ScDP') ? 'prod_TVX1yRMBGoFRc4' : 'prod_TVX1cx1sbChMh6';
      const oneTimePrice = await stripe.prices.create({
        unit_amount: plan.amount,
        currency: 'usd',
        product: productId,
        metadata: {
          plan_id: planId,
          type: 'one_time_purchase',
        },
      });
      priceId = oneTimePrice.id;
    }

    // Create Stripe Checkout Session (works on HTTP localhost with live keys!)
    const sessionConfig: any = {
      customer: customerId,
      mode: isOneTime ? 'payment' : 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${req.headers.get('origin')}/dashboard?payment=success&plan=${planId}&mode=${isOneTime ? 'one_time' : 'subscription'}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pay?plan=${planId}&cancelled=true`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        payment_mode: isOneTime ? 'one_time' : 'subscription',
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    };

    // Add subscription-specific data
    if (!isOneTime) {
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      };
    } else {
      // For one-time payments, store info for manual subscription tracking
      sessionConfig.payment_intent_data = {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          payment_mode: 'one_time',
        },
      };
    }

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

