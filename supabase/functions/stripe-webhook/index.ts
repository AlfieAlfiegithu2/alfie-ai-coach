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

    // Helper function to record affiliate referral
    async function recordAffiliateReferral(params: {
      affiliateCodeId: string;
      affiliateId: string;
      userId: string;
      stripePaymentIntentId?: string;
      stripeCheckoutSessionId?: string;
      originalAmount: number;
      discountAmount: number;
      finalAmount: number;
      currency: string;
      planId: string;
    }) {
      try {
        // Get affiliate's commission percent
        const { data: affiliate } = await supabaseAdmin
          .from('affiliates')
          .select('commission_percent')
          .eq('id', params.affiliateId)
          .single();

        if (!affiliate) {
          console.error('Affiliate not found:', params.affiliateId);
          return;
        }

        // Calculate commission based on final amount paid (after discount)
        const commissionAmount = Math.round((params.finalAmount * (affiliate.commission_percent / 100)) * 100) / 100;

        // Create referral record
        const { error: referralError } = await supabaseAdmin
          .from('affiliate_referrals')
          .insert({
            affiliate_code_id: params.affiliateCodeId,
            affiliate_id: params.affiliateId,
            user_id: params.userId,
            stripe_payment_intent_id: params.stripePaymentIntentId || null,
            stripe_checkout_session_id: params.stripeCheckoutSessionId || null,
            original_amount: params.originalAmount / 100, // Convert from cents to dollars
            discount_amount: params.discountAmount / 100,
            final_amount: params.finalAmount / 100,
            currency: params.currency,
            commission_amount: commissionAmount / 100, // Store in dollars
            commission_status: 'pending',
            plan_id: params.planId,
          });

        if (referralError) {
          console.error('Failed to create referral record:', referralError);
          return;
        }

        // Increment redemption count on affiliate code
        const { error: updateError } = await supabaseAdmin.rpc('increment_affiliate_code_redemptions', {
          code_id: params.affiliateCodeId
        });

        // Fallback if RPC doesn't exist - use raw update
        if (updateError) {
          await supabaseAdmin
            .from('affiliate_codes')
            .update({ current_redemptions: supabaseAdmin.rpc('increment', { row_id: params.affiliateCodeId }) })
            .eq('id', params.affiliateCodeId);
          
          // Simple increment as final fallback
          const { data: codeData } = await supabaseAdmin
            .from('affiliate_codes')
            .select('current_redemptions')
            .eq('id', params.affiliateCodeId)
            .single();
          
          if (codeData) {
            await supabaseAdmin
              .from('affiliate_codes')
              .update({ current_redemptions: (codeData.current_redemptions || 0) + 1 })
              .eq('id', params.affiliateCodeId);
          }
        }

        console.log(`Affiliate referral recorded: ${params.affiliateCodeId}, commission: ${commissionAmount / 100} ${params.currency}`);
      } catch (err) {
        console.error('Error recording affiliate referral:', err);
      }
    }

    // Handle checkout session completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id || session.metadata?.userId;
      const planId = session.metadata?.plan_id || session.metadata?.planId;
      const months = parseInt(session.metadata?.months || '1');
      const customerId = session.customer as string;
      
      // Affiliate tracking
      const affiliateCodeId = session.metadata?.affiliate_code_id;
      const affiliateId = session.metadata?.affiliate_id;

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

        // Record affiliate referral if present
        if (affiliateCodeId && affiliateId) {
          const amountTotal = session.amount_total || 0;
          const amountSubtotal = session.amount_subtotal || amountTotal;
          const discountAmount = (session.total_details?.amount_discount || 0);
          
          await recordAffiliateReferral({
            affiliateCodeId,
            affiliateId,
            userId,
            stripeCheckoutSessionId: session.id,
            originalAmount: amountSubtotal,
            discountAmount: discountAmount,
            finalAmount: amountTotal,
            currency: session.currency || 'usd',
            planId: planId || 'unknown',
          });
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

    // Handle successful payment (for one-time payments / embedded checkout)
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = pi.metadata?.user_id;
      const planId = pi.metadata?.plan_id;
      const months = parseInt(pi.metadata?.months || '1');
      
      // Affiliate tracking from embedded payment
      const affiliateCodeId = pi.metadata?.affiliate_code_id;
      const affiliateId = pi.metadata?.affiliate_id;
      const originalAmount = parseInt(pi.metadata?.original_amount || '0');
      const discountAmount = parseInt(pi.metadata?.discount_amount || '0');

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

        // Record affiliate referral if present
        if (affiliateCodeId && affiliateId) {
          await recordAffiliateReferral({
            affiliateCodeId,
            affiliateId,
            userId,
            stripePaymentIntentId: pi.id,
            originalAmount: originalAmount || pi.amount,
            discountAmount: discountAmount,
            finalAmount: pi.amount,
            currency: pi.currency,
            planId: planId,
          });
        }
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

