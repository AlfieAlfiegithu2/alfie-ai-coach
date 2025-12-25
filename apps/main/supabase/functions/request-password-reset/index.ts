import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to return error responses that frontend can parse
function errorResponse(message: string, headers: Record<string, string>, status = 200) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...headers, "Content-Type": "application/json" } }
  );
}

// Generate a random 6-digit OTP using crypto for better randomness
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (100000 + (array[0] % 900000)).toString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return errorResponse("Email is required", corsHeaders);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Invalid email format", corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English AIdol <no-reply@englishaidol.com>";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists using getUserByEmail for better reliability
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    if (userError) {
      console.error("Error checking user existence:", userError);
      // If it's a "user not found" error, we still want to show the generic message
      if (userError.message?.includes('User not found') || userError.status === 404) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return new Response(
          JSON.stringify({ success: true, message: "If an account exists, a reset code has been sent" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // For other errors (like invalid service key), throw it to the catch block
      throw userError;
    }

    const userExists = !!userData?.user;

    // Rate limiting: Check if an OTP was created within the last 60 seconds
    const { data: existingOtp } = await supabase
      .from('password_reset_otps')
      .select('created_at')
      .eq('email', email.toLowerCase())
      .single();

    if (existingOtp) {
      const createdAt = new Date(existingOtp.created_at);
      const now = new Date();
      const secondsSinceLastOtp = (now.getTime() - createdAt.getTime()) / 1000;

      if (secondsSinceLastOtp < 60) {
        const waitTime = Math.ceil(60 - secondsSinceLastOtp);
        return errorResponse(`Please wait ${waitTime} seconds before requesting another code.`, corsHeaders);
      }
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return errorResponse("Email service not configured. Please contact support.", corsHeaders);
    }

    // Generate OTP using crypto for better randomness
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Delete any existing password reset OTPs for this email
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('email', email.toLowerCase());

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('password_reset_otps')
      .insert({
        email: email.toLowerCase(),
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        used: false
      });

    if (insertError) {
      console.error("Error storing password reset OTP:", insertError);
      // If table doesn't exist, return a helpful error
      if (insertError.code === '42P01') {
        return errorResponse("Password reset not configured. Please contact support.", corsHeaders);
      }
      throw insertError;
    }

    // Send branded email via Resend
    const subject = "Your English AIdol Password Reset Code";
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
      <h1 style="color: #d97757; font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; font-family: Georgia, serif;">Reset Your Password</h1>
      
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 30px; text-align: center;">
        You requested to reset your password. Use the code below to set a new password.
      </p>

      <div style="background-color: #faf8f6; border: 2px solid #d97757; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2d2d2d; font-family: 'Courier New', monospace;">${otp}</span>
      </div>

      <p style="color: #666666; font-size: 14px; text-align: center;">
        This code will expire in <strong>15 minutes</strong>.
      </p>

      <p style="color: #999999; font-size: 13px; text-align: center; margin-top: 30px;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
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

    console.log(`Attempting to send reset email to: ${email} using ${FROM_EMAIL}`);

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
      console.error("Resend API error detail:", errorText);

      // Check for specific Resend errors like unverified domain
      if (errorText.includes('not verified') || errorText.includes('domain')) {
        return errorResponse("Email delivery failed: Domain not verified in Resend.", corsHeaders);
      }

      return errorResponse("Failed to send reset email. Please try again later.", corsHeaders);
    }

    const emailResult = await emailRes.json();
    console.log("Password reset email sent successfully:", emailResult.id);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset code sent to your email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in request-password-reset:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred. Please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

