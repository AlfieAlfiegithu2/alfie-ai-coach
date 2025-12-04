import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateCodeRequest {
  code: string;
  amount?: number; // Original amount to calculate discount
  currency?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const body: ValidateCodeRequest = await req.json();
    const { code, amount, currency = 'usd' } = body;

    if (!code) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Code is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the affiliate code
    const { data: affiliateCode, error } = await supabase
      .from("affiliate_codes")
      .select(`
        id,
        code,
        stripe_promo_code_id,
        discount_type,
        discount_value,
        currency,
        max_redemptions,
        current_redemptions,
        expires_at,
        is_active,
        affiliate:affiliates (
          id,
          name,
          status
        )
      `)
      .eq("code", code.toUpperCase())
      .single();

    if (error || !affiliateCode) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Invalid promo code" 
      }), {
        status: 200, // Return 200 but with valid: false
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if code is active
    if (!affiliateCode.is_active) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "This code is no longer active" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if affiliate is active
    const affiliate = affiliateCode.affiliate as { id: string; name: string; status: string } | null;
    if (!affiliate || affiliate.status !== 'active') {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "This code is no longer valid" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (affiliateCode.expires_at && new Date(affiliateCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "This code has expired" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check redemption limit
    if (affiliateCode.max_redemptions && affiliateCode.current_redemptions >= affiliateCode.max_redemptions) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "This code has reached its maximum redemptions" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate discount
    let discountAmount = 0;
    let discountPercent = 0;

    if (affiliateCode.discount_type === 'percent') {
      discountPercent = affiliateCode.discount_value;
      if (amount) {
        discountAmount = Math.round(amount * (affiliateCode.discount_value / 100) * 100) / 100;
      }
    } else {
      // Fixed amount discount
      discountAmount = affiliateCode.discount_value;
      if (amount && amount > 0) {
        discountPercent = Math.round((affiliateCode.discount_value / amount) * 100);
      }
    }

    return new Response(JSON.stringify({ 
      valid: true,
      code: affiliateCode.code,
      discountType: affiliateCode.discount_type,
      discountValue: affiliateCode.discount_value,
      discountAmount: amount ? discountAmount : null,
      discountPercent: affiliateCode.discount_type === 'percent' ? discountPercent : null,
      stripePromoCodeId: affiliateCode.stripe_promo_code_id,
      affiliateCodeId: affiliateCode.id,
      message: affiliateCode.discount_type === 'percent' 
        ? `${affiliateCode.discount_value}% off applied!`
        : `$${affiliateCode.discount_value} off applied!`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error validating affiliate code:", error);
    return new Response(JSON.stringify({ 
      valid: false, 
      error: "Failed to validate code" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

