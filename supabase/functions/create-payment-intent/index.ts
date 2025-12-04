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

    // Create admin client early for affiliate code lookup
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { planId, successUrl, cancelUrl, currency = 'usd', months = 1, affiliateCode } = await req.json();

    // Look up affiliate code if provided
    let affiliateCodeData: {
      id: string;
      stripe_promo_code_id: string;
      affiliate_id: string;
    } | null = null;

    if (affiliateCode) {
      const { data: codeData } = await supabaseAdmin
        .from('affiliate_codes')
        .select('id, stripe_promo_code_id, affiliate_id, is_active, expires_at, max_redemptions, current_redemptions')
        .eq('code', affiliateCode.toUpperCase())
        .single();

      if (codeData && codeData.is_active && codeData.stripe_promo_code_id) {
        // Validate the code is still valid
        const isExpired = codeData.expires_at && new Date(codeData.expires_at) < new Date();
        const isMaxedOut = codeData.max_redemptions && codeData.current_redemptions >= codeData.max_redemptions;
        
        if (!isExpired && !isMaxedOut) {
          affiliateCodeData = {
            id: codeData.id,
            stripe_promo_code_id: codeData.stripe_promo_code_id,
            affiliate_id: codeData.affiliate_id,
          };
        }
      }
    }

    // Base prices in USD cents
    const basePrices = {
      pro: 4900,    // $49.00 USD
      ultra: 19900, // $199.00 USD
    };
    
    // Exchange rates (approximate, hardcoded for consistency)
    const rates = { usd: 1, krw: 1350, cny: 7.2 };

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

    const multiplier = getMultiplier(months);
    
    // Calculate amount
    let totalAmount: number;
    const baseAmount = planId === 'ultra' ? basePrices.ultra : basePrices.pro;

    if (currency === 'krw') {
      totalAmount = Math.round((baseAmount / 100) * rates.krw * months * multiplier);
    } else if (currency === 'cny') {
      totalAmount = Math.round(baseAmount * rates.cny * months * multiplier);
    } else {
      totalAmount = Math.round(baseAmount * months * multiplier);
    }
    
    // Logic for payment mode:
    // 1. If currency is NOT USD => Must be one-time (Alipay/Kakao don't support recurring)
    // 2. If currency IS USD => Can be recurring for all durations (1, 3, 6 months)
    const isSubscription = currency === 'usd'; 
    const mode = isSubscription ? 'subscription' : 'payment';
    const planName = months > 1 ? `${plan.name} (${months} months)` : plan.name;

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeSecret) throw new Error("Stripe secret not configured");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Check if user already has a Stripe customer ID
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
        // Add affiliate tracking data if present
        ...(affiliateCodeData && {
          affiliate_code_id: affiliateCodeData.id,
          affiliate_id: affiliateCodeData.affiliate_id,
        }),
      },
      billing_address_collection: 'auto',
    };

    // Apply affiliate promo code if provided, otherwise allow manual promo code entry
    if (affiliateCodeData?.stripe_promo_code_id) {
      sessionConfig.discounts = [{ promotion_code: affiliateCodeData.stripe_promo_code_id }];
    } else {
      sessionConfig.allow_promotion_codes = true;
    }

    if (mode === 'subscription') {
      if (months === 1) {
        // Use existing monthly price object
        sessionConfig.line_items.push({
          price: plan.recurringPriceId,
          quantity: 1,
        });
      } else {
        // Create dynamic recurring price for 3/6 months
        // Note: Recurring prices are supported with price_data in Checkout!
        sessionConfig.line_items.push({
          price_data: {
            currency: 'usd',
            product: planMap[planId].recurringPriceId.includes('ScDP') ? 'prod_TVX1yRMBGoFRc4' : 'prod_TVX1cx1sbChMh6', // Infer product ID from price ID or map
            unit_amount: totalAmount, // Total for the period (e.g. $125 for 3 months)
            recurring: {
              interval: 'month',
              interval_count: months, // e.g. every 3 months
            },
          },
          quantity: 1,
        });
      }
      
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      };
    } else {
      // One-time payment (for non-USD currencies like KRW/CNY to allow local payment methods)
      sessionConfig.line_items.push({
        price_data: {
          currency: currency,
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
          currency: currency,
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

