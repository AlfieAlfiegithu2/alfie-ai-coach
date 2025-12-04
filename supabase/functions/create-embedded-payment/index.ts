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

    const { planId, months = 1, currency = 'usd', affiliateCode } = await req.json();

    // Get admin client for affiliate code lookup
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up affiliate code if provided
    let affiliateCodeData: {
      id: string;
      affiliate_id: string;
      discount_type: string;
      discount_value: number;
    } | null = null;

    if (affiliateCode) {
      const { data: codeData } = await supabaseAdmin
        .from('affiliate_codes')
        .select('id, affiliate_id, discount_type, discount_value, is_active, expires_at, max_redemptions, current_redemptions')
        .eq('code', affiliateCode.toUpperCase())
        .single();

      if (codeData && codeData.is_active) {
        const isExpired = codeData.expires_at && new Date(codeData.expires_at) < new Date();
        const isMaxedOut = codeData.max_redemptions && codeData.current_redemptions >= codeData.max_redemptions;
        
        if (!isExpired && !isMaxedOut) {
          affiliateCodeData = {
            id: codeData.id,
            affiliate_id: codeData.affiliate_id,
            discount_type: codeData.discount_type,
            discount_value: codeData.discount_value,
          };
        }
      }
    }

    // Final prices per month in USD cents (matching frontend FINAL_PRICES)
    const finalPrices = {
      pro: {
        monthly: 4900,      // $49/month
        threeMonth: 3900,   // $39/month
        sixMonth: 2900,     // $29/month
      },
      ultra: {
        monthly: 19900,     // $199/month
        threeMonth: 14900,  // $149/month
        sixMonth: 11900,    // $119/month
      },
    };

    // Display prices (weekly rate × 4) in USD cents
    const displayPrices = {
      pro: 8000,      // $80/month
      ultra: 30000,   // $300/month
    };
    
    // Exchange rates (approximate, hardcoded for consistency)
    const rates: Record<string, number> = { usd: 1, krw: 1350, cny: 7.2 };
    
    // Get monthly price based on billing cycle
    const getMonthlyPrice = (planKey: string, m: number | string): number => {
      const plan = planKey === 'premium' ? 'pro' : planKey;
      const prices = finalPrices[plan as keyof typeof finalPrices];
      if (!prices) return finalPrices.pro.monthly;
      
      if (m === 'week' || m === 0.25) return displayPrices[plan as keyof typeof displayPrices]; // Weekly = full price
      if (m >= 6) return prices.sixMonth;
      if (m >= 3) return prices.threeMonth;
      return prices.monthly;
    };

    // Plan configuration
    const planMap: Record<string, { name: string }> = {
      premium: { name: "Pro Plan - English AIdol" },
      pro: { name: "Pro Plan - English AIdol" },
      ultra: { name: "Ultra Plan - English AIdol" },
    };

    const plan = planMap[planId as string];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Calculate total amount
    const isWeekly = months === 'week' || months === 0.25;
    const actualMonths = isWeekly ? 0.25 : months;
    const monthlyPriceCents = getMonthlyPrice(planId, months);
    
    // Convert to target currency
    let amount: number;
    if (currency === 'krw') {
      // KRW has no decimals - convert from cents to dollars first
      amount = Math.round((monthlyPriceCents / 100) * actualMonths * rates.krw);
    } else if (currency === 'cny') {
      // CNY uses fen (cents)
      amount = Math.round(monthlyPriceCents * actualMonths * rates.cny);
    } else {
      // USD - already in cents
      amount = Math.round(monthlyPriceCents * actualMonths);
    }

    const planName = isWeekly 
      ? `${plan.name} (1 week)` 
      : months > 1 
        ? `${plan.name} (${months} months)` 
        : plan.name;

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeSecret) throw new Error("Stripe secret not configured");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer
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

    // Apply affiliate discount if present
    let discountAmount = 0;
    let finalAmount = amount;
    
    if (affiliateCodeData) {
      if (affiliateCodeData.discount_type === 'percent') {
        discountAmount = Math.round(amount * (affiliateCodeData.discount_value / 100));
      } else {
        // Fixed amount discount - convert to currency cents
        if (currency === 'usd') {
          discountAmount = Math.round(affiliateCodeData.discount_value * 100);
        } else if (currency === 'krw') {
          discountAmount = Math.round(affiliateCodeData.discount_value * rates.krw);
        } else if (currency === 'cny') {
          discountAmount = Math.round(affiliateCodeData.discount_value * 100 * rates.cny);
        }
      }
      finalAmount = Math.max(amount - discountAmount, 100); // Minimum $1 charge
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
        plan_name: planName,
        months: String(months),
        currency: currency,
        original_amount: String(amount),
        discount_amount: String(discountAmount),
        ...(affiliateCodeData && {
          affiliate_code_id: affiliateCodeData.id,
          affiliate_id: affiliateCodeData.affiliate_id,
        }),
      },
    });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      originalAmount: amount,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
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

