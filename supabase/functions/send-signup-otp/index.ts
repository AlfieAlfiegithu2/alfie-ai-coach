import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random 6-digit OTP
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English AIdol <no-reply@englishaidol.com>";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check if user already exists with confirmed email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser && existingUser.email_confirmed_at) {
      // Return as success:false with 200 so frontend can parse the message properly
      return new Response(JSON.stringify({
        success: false,
        error: "This email is already registered. Please sign in instead."
      }), {
        status: 200, // Use 200 so Supabase client doesn't throw
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Delete any existing OTPs for this email
    await supabase
      .from("signup_otps")
      .delete()
      .eq("email", email.toLowerCase());

    // Store new OTP in database
    const { error: insertError } = await supabase
      .from("signup_otps")
      .insert({
        email: email.toLowerCase(),
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        used: false
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      // If table doesn't exist, provide a helpful error
      if (insertError.code === '42P01') {
        throw new Error("OTP storage not configured. Please contact support.");
      }
      throw new Error("Failed to store verification code");
    }

    // Check if Resend is configured
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured - OTP stored but email not sent");
      console.log(`[DEV] OTP for ${email}: ${otp}`);

      // For development: return the OTP (remove in production!)
      return new Response(JSON.stringify({
        success: true,
        message: "OTP generated (check server logs - configure RESEND_API_KEY for email delivery)",
        _dev_otp: otp // Remove this in production!
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send branded email via Resend
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
