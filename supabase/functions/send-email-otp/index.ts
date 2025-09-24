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
    if (!email) throw new Error("email is required");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English Aidol <no-reply@englishaidol.com>";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // generate 6-digit otp and expiry
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // store in a simple table email_otps (email text, code text, expires_at timestamptz)
    await admin.from('email_otps').insert({ email, code, expires_at });

    // send via Resend if available
    if (RESEND_API_KEY) {
      const subject = "Your English Aidol verification code";
      const html = `<div style=\"font-family:Inter,Arial,sans-serif;line-height:1.6\">
        <h2>Welcome to English Aidol</h2>
        <p>Your verification code is:</p>
        <p style=\"font-size:28px;font-weight:700\">${code}</p>
        <p style=\"color:#6b7280;font-size:12px\">This code expires in 10 minutes.</p>
      </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html })
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});


