import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET env");
      return new Response("Missing webhook secret", { status: 500, headers: corsHeaders });
    }

    const stripe = new Stripe(stripeSecret || "sk_test_", { apiVersion: "2023-10-16" });

    const sig = req.headers.get("stripe-signature") ?? "";
    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed", err);
      return new Response("Bad signature", { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = (pi.metadata?.user_id as string) || null;
      const planId = (pi.metadata?.plan_id as string) || null;

      if (userId) {
        // Grant access: mark user as premium (adjust to your schema)
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ role: "premium" })
          .eq("id", userId);
        if (error) console.error("Failed updating profile role", error);
      }

      console.log("Payment succeeded", { userId, planId, amount: pi.amount, currency: pi.currency });
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log("Payment failed", { userId: pi.metadata?.user_id, error: pi.last_payment_error?.message });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook handler error", e);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});


