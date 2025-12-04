import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAffiliateCodeRequest {
  affiliateId: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  currency?: string;
  maxRedemptions?: number;
  expiresAt?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreateAffiliateCodeRequest = await req.json();
    const { 
      affiliateId, 
      code, 
      discountType, 
      discountValue, 
      currency = 'usd',
      maxRedemptions,
      expiresAt 
    } = body;

    // Validate required fields
    if (!affiliateId || !code || !discountType || !discountValue) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify affiliate exists
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from("affiliates")
      .select("id, name, status")
      .eq("id", affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      return new Response(JSON.stringify({ error: "Affiliate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if code already exists
    const { data: existingCode } = await supabaseAdmin
      .from("affiliate_codes")
      .select("id")
      .eq("code", code.toUpperCase())
      .single();

    if (existingCode) {
      return new Response(JSON.stringify({ error: "Code already exists" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      throw new Error("Stripe secret key not configured");
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Create Stripe coupon
    const couponParams: Stripe.CouponCreateParams = {
      name: `Affiliate: ${affiliate.name} - ${code.toUpperCase()}`,
      duration: "once", // One-time discount
    };

    if (discountType === 'percent') {
      couponParams.percent_off = discountValue;
    } else {
      couponParams.amount_off = Math.round(discountValue * 100); // Convert to cents
      couponParams.currency = currency;
    }

    if (maxRedemptions) {
      couponParams.max_redemptions = maxRedemptions;
    }

    if (expiresAt) {
      couponParams.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);
    }

    const stripeCoupon = await stripe.coupons.create(couponParams);

    // Create Stripe promotion code
    const promoCodeParams: Stripe.PromotionCodeCreateParams = {
      coupon: stripeCoupon.id,
      code: code.toUpperCase(),
      active: true,
    };

    if (maxRedemptions) {
      promoCodeParams.max_redemptions = maxRedemptions;
    }

    if (expiresAt) {
      promoCodeParams.expires_at = Math.floor(new Date(expiresAt).getTime() / 1000);
    }

    const stripePromoCode = await stripe.promotionCodes.create(promoCodeParams);

    // Save to database
    const { data: affiliateCode, error: insertError } = await supabaseAdmin
      .from("affiliate_codes")
      .insert({
        affiliate_id: affiliateId,
        code: code.toUpperCase(),
        stripe_coupon_id: stripeCoupon.id,
        stripe_promo_code_id: stripePromoCode.id,
        discount_type: discountType,
        discount_value: discountValue,
        currency: currency,
        max_redemptions: maxRedemptions || null,
        expires_at: expiresAt || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      // Cleanup Stripe resources if DB insert fails
      await stripe.promotionCodes.update(stripePromoCode.id, { active: false });
      await stripe.coupons.del(stripeCoupon.id);
      throw insertError;
    }

    console.log(`Created affiliate code ${code} for affiliate ${affiliate.name}`);

    return new Response(JSON.stringify({ 
      success: true,
      affiliateCode,
      stripePromoCodeId: stripePromoCode.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error creating affiliate code:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

