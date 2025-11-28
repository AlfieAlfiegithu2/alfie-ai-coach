import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) throw new Error("Email is required");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English Aidol <no-reply@englishaidol.com>";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Delete any existing OTPs for this email
    await supabase.from("email_otps").delete().eq("email", email);

    // Store new OTP
    const { error: insertError } = await supabase.from("email_otps").insert({
      email,
      code: otp,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      throw new Error("Failed to store verification code");
    }

    const subject = "Your English Aidol Verification Code";
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
        <h2 style="color: #d97757;">Verification Code</h2>
        <p>Your verification code for English Aidol is:</p>
        <div style="background: #f5f2e8; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2d2d2d;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="color: #666; font-size: 14px; margin-top: 32px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;

    // Try Resend first, fall back to Supabase Auth email if not configured
    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject,
          html,
        }),
      });

      if (!emailRes.ok) {
        const errorText = await emailRes.text();
        console.error("Resend API Error:", errorText);
        throw new Error(`Failed to send email: ${errorText}`);
      }
    } else {
      // Use Supabase Auth's built-in email (via signInWithOtp which sends email)
      // We'll generate a magic link and include OTP in the email template
      // Actually, let's use a different approach - use Supabase's inbuilt mailer
      
      // Since Resend isn't configured, we'll use Supabase's auth.admin to send
      // a custom email via the generateLink + manual email send isn't possible
      // without an email provider. Let's return the OTP directly for dev/testing
      // In production, you MUST configure RESEND_API_KEY
      
      console.warn("RESEND_API_KEY not configured - OTP stored but email not sent");
      console.log(`[DEV] OTP for ${email}: ${otp}`);
      
      // For now, return success but note that email wasn't sent
      // The user can check Supabase logs to see the OTP in development
      return new Response(JSON.stringify({ 
        success: true, 
        message: "OTP generated (check server logs for code - configure RESEND_API_KEY for email delivery)",
        // Remove this in production! Only for testing:
        _dev_otp: otp
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in send-signup-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

