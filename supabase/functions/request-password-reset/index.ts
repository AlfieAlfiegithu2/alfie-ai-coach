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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English AIdol <no-reply@englishaidol.com>";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const emailLower = email.trim().toLowerCase();

    // Always generate OTP and send email (skip user check for now - same as signup)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Delete old OTPs and insert new one
    await supabase.from('password_reset_otps').delete().eq('email', emailLower);
    const { error: insertError } = await supabase.from('password_reset_otps').insert({
      email: emailLower,
      otp_code: otp,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      used: false
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: `DB: ${insertError.message}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Send email - same pattern as working signup
    if (!RESEND_API_KEY) {
      // Dev mode - return the OTP directly
      return new Response(JSON.stringify({
        success: true,
        message: "Code generated (Dev mode)",
        _dev_otp: otp
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [emailLower],
        subject: "Password Reset Code - English AIdol",
        html: `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f5f2e8; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; text-align: center;">
    <h1 style="color: #d97757; font-family: Georgia, serif;">English AIdol</h1>
    <p style="color: #4a4a4a; font-size: 16px;">Your password reset code is:</p>
    <div style="background: #faf8f6; border: 2px solid #d97757; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2d2d2d;">${otp}</span>
    </div>
    <p style="color: #999999; font-size: 13px;">Code expires in 15 minutes.</p>
  </div>
</body>
</html>`
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return new Response(JSON.stringify({ error: `Email failed: ${errText}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Reset code sent to your email" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
