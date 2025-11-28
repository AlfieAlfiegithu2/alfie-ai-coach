import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map product IDs to subscription status
const PRODUCT_TO_STATUS: Record<string, string> = {
  "prod_TVX1yRMBGoFRc4": "premium", // Pro Plan
  "prod_TVX1cx1sbChMh6": "ultra",   // Ultra Plan
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

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

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

    console.log(`Processing Stripe event: ${event.type}`);

    // Handle checkout session completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id || session.metadata?.userId;
      const planId = session.metadata?.plan_id || session.metadata?.planId;
      const months = parseInt(session.metadata?.months || '1');
      const customerId = session.customer as string;

      if (userId) {
        const subscriptionStatus = (planId === 'ultra') ? 'ultra' : 'premium';
        
        const updateData: any = { 
          subscription_status: subscriptionStatus,
          stripe_customer_id: customerId,
        };

        // If one-time payment (no subscription), set expiration
        if (session.mode === 'payment') {
           const expiresAt = new Date();
           expiresAt.setMonth(expiresAt.getMonth() + months);
           updateData.subscription_expires_at = expiresAt.toISOString();
           updateData.stripe_subscription_id = null;
        } else {
           updateData.stripe_subscription_id = session.subscription as string;
        }

        const { error } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", userId);

        if (error) {
          console.error("Failed updating profile after checkout:", error);
        } else {
          console.log(`User ${userId} updated: ${subscriptionStatus}, mode=${session.mode}, months=${months}`);
        }
      }
    }

    // Handle subscription created
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const userId = subscription.metadata?.user_id || subscription.metadata?.userId;
      
      const productId = subscription.items.data[0]?.price?.product as string;
      const subscriptionStatus = PRODUCT_TO_STATUS[productId] || 'premium';

      if (userId) {
        await supabaseAdmin
          .from("profiles")
          .update({ 
            subscription_status: subscriptionStatus,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq("id", userId);
      } else {
        // Try to find user by customer ID
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({ 
              subscription_status: subscriptionStatus,
              stripe_subscription_id: subscription.id,
              subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
            })
            .eq("id", profile.id);
        }
      }
      console.log(`Subscription created for customer ${customerId}: ${subscriptionStatus}`);
    }

    // Handle subscription updated
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const productId = subscription.items.data[0]?.price?.product as string;
      
      let subscriptionStatus = 'premium';
      if (subscription.status === 'active') {
        subscriptionStatus = PRODUCT_TO_STATUS[productId] || 'premium';
      } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        subscriptionStatus = 'free';
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({ 
            subscription_status: subscriptionStatus,
            subscription_expires_at: subscription.cancel_at 
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq("id", profile.id);
      }
    }

    // Handle subscription deleted
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({ 
            subscription_status: 'free',
            stripe_subscription_id: null,
            subscription_expires_at: null
          })
          .eq("id", profile.id);
      }
    }

    // Handle successful payment (for one-time payments)
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = pi.metadata?.user_id;
      const planId = pi.metadata?.plan_id;
      const months = parseInt(pi.metadata?.months || '1');

      if (userId && planId) {
        const subscriptionStatus = (planId === 'ultra') ? 'ultra' : 'premium';
        
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);

        await supabaseAdmin
          .from("profiles")
          .update({ 
             subscription_status: subscriptionStatus,
             subscription_expires_at: expiresAt.toISOString()
          })
          .eq("id", userId);
          
        console.log(`Payment succeeded for user ${userId}: ${subscriptionStatus} for ${months} months`);
      }
    }

    // Handle invoice payment succeeded
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const productId = subscription.items.data[0]?.price?.product as string;
        const subscriptionStatus = PRODUCT_TO_STATUS[productId] || 'premium';

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({ 
              subscription_status: subscriptionStatus,
              subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
            })
            .eq("id", profile.id);
        }
      }
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

