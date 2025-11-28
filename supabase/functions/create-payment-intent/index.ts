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

    const { planId, successUrl, cancelUrl, currency = 'usd', months = 1 } = await req.json();

    // All prices in USD cents - Stripe will convert to local currency automatically
    const basePrices = {
      pro: 4900,    // $49.00 USD
      ultra: 19900, // $199.00 USD
    };

    // Plan configuration
    const planMap: Record<string, { 
      name: string; 
      recurringPriceId: string; // For 1-month subscription
    }> = {
      premium: { 
        name: "Pro Plan - English AIdol",
        recurringPriceId: "price_1SYVxbCg5LtU404t7ty3ScDP",
      },
      pro: { 
        name: "Pro Plan - English AIdol",
        recurringPriceId: "price_1SYVxbCg5LtU404t7ty3ScDP",
      },
      ultra: { 
        name: "Ultra Plan - English AIdol",
        recurringPriceId: "price_1SYVxcCg5LtU404tn1up3ilK",
      },
    };

    const plan = planMap[planId as string];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan. Choose 'pro' or 'ultra'" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Discount multipliers
    const getMultiplier = (m: number) => {
      if (m >= 6) return 0.70; // 30% off
      if (m >= 3) return 0.85; // 15% off
      return 1.0;
    };

    const baseAmount = planId === 'ultra' ? basePrices.ultra : basePrices.pro;
    const multiplier = getMultiplier(months);
    const totalAmount = Math.round(baseAmount * months * multiplier);
    
    // If months > 1, force one-time payment
    const isSubscription = months === 1; 
    const mode = isSubscription ? 'subscription' : 'payment';
    const planName = months > 1 ? `${plan.name} (${months} months)` : plan.name;

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
    
    // Create Stripe Checkout Session
    const sessionConfig: any = {
      customer: customerId,
      mode: mode,
      line_items: [], // will be populated below
      success_url: successUrl || `${req.headers.get('origin')}/dashboard?payment=success&plan=${planId}&months=${months}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/pay?plan=${planId}&cancelled=true`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        months: months,
        payment_mode: mode,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    };

    if (mode === 'subscription') {
      // Use recurring price ID for monthly subscription
      sessionConfig.line_items.push({
        price: plan.recurringPriceId,
        quantity: 1,
      });
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      };
    } else {
      // One-time payment (or multi-month package)
      sessionConfig.line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: planName,
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      });
      sessionConfig.payment_intent_data = {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          months: months,
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

