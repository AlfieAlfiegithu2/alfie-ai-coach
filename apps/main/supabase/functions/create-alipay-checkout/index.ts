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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { planId } = await req.json();

    const planMap: Record<string, { amount: number; name: string }> = {
      premium: { amount: 999, name: "Premium (30 days)" },
      unlimited: { amount: 2999, name: "Unlimited (30 days)" },
    };

    const plan = planMap[planId as string];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeSecret) throw new Error("Stripe secret not configured");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["alipay"],
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: plan.amount,
            product_data: { name: plan.name },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
      success_url: `${origin}/personal-page?alipay=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/personal-page?alipay=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


