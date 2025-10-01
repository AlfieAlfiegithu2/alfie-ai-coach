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
    const { email, code } = await req.json();
    if (!email || !code) throw new Error("email and code are required");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data, error } = await admin
      .from('email_otps')
      .select('id, expires_at')
      .eq('email', email)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) throw new Error('Invalid code');
    if (new Date(data.expires_at).getTime() < Date.now()) throw new Error('Code expired');

    // Optionally clean up used OTP (best-effort)
    await admin.from('email_otps').delete().eq('email', email).eq('code', code);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});


