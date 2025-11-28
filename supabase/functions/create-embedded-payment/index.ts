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

    const { planId, months = 1, currency = 'usd' } = await req.json();

    // Base prices in USD cents
    const basePrices = {
      pro: 4900,    // $49.00 USD
      ultra: 19900, // $199.00 USD
    };
    
    // Exchange rates (approximate, hardcoded for consistency)
    const rates = { usd: 1, krw: 1350, cny: 7.2 };
    
    // Discount multipliers
    const getMultiplier = (m: number) => {
      if (m >= 6) return 0.70;
      if (m >= 3) return 0.85;
      return 1.0;
    };

    // Plan configuration
    const planMap: Record<string, { baseAmount: number; name: string }> = {
      premium: { baseAmount: basePrices.pro, name: "Pro Plan - English AIdol" },
      pro: { baseAmount: basePrices.pro, name: "Pro Plan - English AIdol" },
      ultra: { baseAmount: basePrices.ultra, name: "Ultra Plan - English AIdol" },
    };

    const plan = planMap[planId as string];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Calculate total amount in selected currency
    const multiplier = getMultiplier(months);
    
    // Convert base amount (USD cents) to target currency amount
    // USD: cents
    // KRW: no decimals (divide by 100 first to get dollars, then multiply by rate)
    // CNY: fen (cents)
    
    let amount: number;
    if (currency === 'krw') {
      // Base amount is in cents. Divide by 100 to get dollars. Multiply by rate. No cents in KRW.
      amount = Math.round((plan.baseAmount / 100) * rates.krw * months * multiplier);
    } else if (currency === 'cny') {
      // Base amount is in cents. Multiply by rate. Result in fen.
      amount = Math.round(plan.baseAmount * rates.cny * months * multiplier);
    } else {
      // USD
      amount = Math.round(plan.baseAmount * months * multiplier);
    }

    const planName = months > 1 ? `${plan.name} (${months} months)` : plan.name;

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeSecret) throw new Error("Stripe secret not configured");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer
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
          metadata: { supabase_user_id: user.id }
        });
        customerId = customer.id;
      }

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
        plan_name: planName,
        months: months,
        currency: currency,
      },
    });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Embedded payment error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

