import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Initialize inside handler to ensure env vars are available
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English AIdol <no-reply@englishaidol.com>";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const emailLower = email.trim().toLowerCase();
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Check for existing user using listUsers (getUserByEmail doesn't exist in supabase-js@2)
    // We use a paginated search to find the user by email
    try {
      const { data: usersData } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // Find user with matching email (case-insensitive)
      const existingUser = usersData?.users?.find(
        (u: any) => u.email?.toLowerCase() === emailLower
      );

      if (existingUser && existingUser.email_confirmed_at) {
        throw new Error("This email is already registered. Please sign in instead.");
      }
    } catch (userCheckError: any) {
      // If it's our own "already registered" error, rethrow it
      if (userCheckError.message?.includes("already registered")) {
        throw userCheckError;
      }
      // Otherwise log but continue - don't block signup for user check failures
      console.warn("User check warning:", userCheckError.message);
    }

    // Delete any existing OTPs for this email
    await supabase.from("signup_otps").delete().eq("email", emailLower);

    // Store new OTP in database
    const { error: insertError } = await supabase
      .from("signup_otps")
      .insert({
        email: emailLower,
        otp_code: otp,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        used: false
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      if (insertError.code === '42P01') {
        throw new Error("OTP storage not configured. Please contact support.");
      }
      throw new Error("Failed to store verification code");
    }

    if (!RESEND_API_KEY) {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
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
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f2e8; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    
    <!-- Header with Logo -->
    <div style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 1px solid #e6e0d4;">
      <div style="font-size: 28px; font-weight: bold; color: #d97757; font-family: Georgia, serif;">English AIdol</div>
    </div>

    <!-- Content -->
    <div style="padding: 40px;">
      <h1 style="color: #d97757; font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; font-family: Georgia, serif;">Verify your email</h1>
      
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 30px; text-align: center;">
        Welcome to English AIdol! Use the verification code below to complete your sign up.
      </p>

      <div style="background-color: #faf8f6; border: 2px solid #d97757; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2d2d2d; font-family: 'Courier New', monospace;">${otp}</span>
      </div>

      <p style="color: #666666; font-size: 14px; text-align: center;">
        This code will expire in <strong>10 minutes</strong>.
      </p>

      <p style="color: #999999; font-size: 13px; text-align: center; margin-top: 30px;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #faf8f6; padding: 20px; text-align: center; border-top: 1px solid #e6e0d4;">
      <p style="color: #999999; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} English AIdol. All rights reserved.
      </p>
      <p style="color: #bbbbbb; font-size: 11px; margin-top: 8px;">
        Your AI-powered English learning companion
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
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

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailRes.json();
    console.log("Signup OTP email sent successfully:", emailResult.id);

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

