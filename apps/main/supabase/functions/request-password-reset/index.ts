import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English AIdol <no-reply@englishaidol.com>";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email) throw new Error("Email is required-APPS");

    const emailLower = email.trim().toLowerCase();

    // User lookup
    const { data: userData } = await supabase.auth.admin.getUserByEmail(emailLower);
    const user = userData?.user;

    if (!user) {
      return new Response(JSON.stringify({
        success: true,
        message: "If an account exists, a reset code has been sent"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase.from('password_reset_otps').delete().eq('email', emailLower);
    const { error: insertError } = await supabase.from('password_reset_otps').insert({
      email: emailLower,
      otp_code: otp,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      used: false
    });

    if (insertError) throw new Error(`DB Error: ${insertError.message}`);
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const html = `<p>Your code is: <strong>${otp}</strong></p>`;
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [emailLower], subject: "Reset Code", html }),
    });

    if (!emailRes.ok) throw new Error(`Email fail: ${await emailRes.text()}`);

    return new Response(JSON.stringify({ success: true, message: "Code sent-APPS" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message || "APPS Error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
