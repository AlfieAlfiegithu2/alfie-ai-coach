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
    const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:8080";
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "English Aidol <no-reply@englishaidol.com>";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${SITE_URL}/signup` },
    });
    if (error) throw error;
    const action_link = (data as any)?.properties?.action_link || (data as any)?.action_link;
    if (!action_link) throw new Error("Failed to generate magic link");

    // Send branded email via Resend if API key provided; otherwise return link for client-side handling
    if (RESEND_API_KEY) {
      const subject = "Verify your email for English Aidol";
      const html = `
        <div style="font-family: Inter,Arial,sans-serif;line-height:1.6">
          <h2>Welcome to English Aidol</h2>
          <p>Click the button below to verify your email and complete sign up.</p>
          <p>
            <a href="${action_link}" style="background:#10b981;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">
              Verify & Login
            </a>
          </p>
          <p style="color:#6b7280;font-size:12px">If the button doesn't work, copy and paste this link:<br/>${action_link}</p>
        </div>`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html }),
      });
      if (!emailRes.ok) {
        const msg = await emailRes.text();
        throw new Error(`Email send failed: ${msg}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


