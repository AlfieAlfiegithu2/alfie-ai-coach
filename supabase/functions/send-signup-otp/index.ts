import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize client outside handler (warm starts)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English AIdol <no-reply@englishaidol.com>";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) throw new Error("Email is required");

    const emailLower = email.trim().toLowerCase();
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 1. Parallelize initial checks and OTP deletion
    // We start these together to save time
    const [userCheck, otpCleanup] = await Promise.all([
      supabase.auth.admin.getUserByEmail(emailLower),
      supabase.from("signup_otps").delete().eq("email", emailLower)
    ]);

    const existingUser = userCheck.data?.user;
    if (existingUser && existingUser.email_confirmed_at) {
      throw new Error("This email is already registered. Please sign in instead.");
    }

    // 2. Parallelize OTP storage and Email sending
    // Once we know the user is valid, we don't need to wait for DB storage to start sending the email
    const insertPromise = supabase
      .from("signup_otps")
      .insert({
        email: emailLower,
        otp_code: otp,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        used: false
      });

    if (!RESEND_API_KEY) {
      const { error: insertError } = await insertPromise;
      if (insertError) throw new Error("Failed to store verification code");

      return new Response(JSON.stringify({
        success: true,
        message: "OTP generated (Dev mode)",
        _dev_otp: otp
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prepare email content
    const subject = "Your English AIdol Verification Code";
    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f5f2e8; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; text-align: center;">
    <h1 style="color: #d97757; font-family: Georgia, serif;">English AIdol</h1>
    <p style="color: #4a4a4a; font-size: 16px;">Your verification code is:</p>
    <div style="background: #faf8f6; border: 2px solid #d97757; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2d2d2d;">${otp}</span>
    </div>
    <p style="color: #999999; font-size: 13px;">Code expires in 10 minutes.</p>
  </div>
</body>
</html>`;

    // Start email push immediately
    const emailPromise = fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [emailLower],
        subject,
        html
      }),
    });

    // Wait for BOTH database and email to finish
    const [insertResult, emailRes] = await Promise.all([insertPromise, emailPromise]);

    if (insertResult.error) {
      console.error("Error storing OTP:", insertResult.error);
      throw new Error("Failed to store verification code");
    }

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Verification code sent to your email"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Error in send-signup-otp:", e);
    return new Response(JSON.stringify({
      success: false,
      error: (e as Error).message
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
