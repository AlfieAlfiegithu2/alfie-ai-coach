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

    const { planId, currency = 'usd' } = await req.json();

    // Currency-specific pricing (amounts in smallest currency unit)
    // USD/CNY: cents/fen (multiply by 100)
    // KRW: no subunits (use actual amount)
    const currencyPricing: Record<string, { pro: number; ultra: number }> = {
      usd: { pro: 4900, ultra: 19900 },    // $49.00, $199.00
      krw: { pro: 65000, ultra: 260000 },  // ₩65,000, ₩260,000 (KRW has no decimals)
      cny: { pro: 35000, ultra: 140000 },  // ¥350.00, ¥1,400.00
    };

    const pricing = currencyPricing[currency] || currencyPricing.usd;
    
    // Plan configuration
    const planMap: Record<string, { amount: number; name: string }> = {
      premium: { amount: pricing.pro, name: "Pro Plan - English AIdol" },
      pro: { amount: pricing.pro, name: "Pro Plan - English AIdol" },
      ultra: { amount: pricing.ultra, name: "Ultra Plan - English AIdol" },
    };

    const plan = planMap[planId as string];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const validCurrency = ['usd', 'krw', 'cny'].includes(currency) ? currency : 'usd';

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

    // Create Payment Intent with ALL payment methods enabled
    // This works with embedded Payment Element on your site
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency: validCurrency,
      customer: customerId,
      // Enable all the payment methods you have in your Stripe dashboard
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
        plan_name: plan.name,
        currency: validCurrency,
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

