import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize client outside for performance (warm starts)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, newPassword, verifyOnly } = await req.json();

    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email and code required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const emailLower = email.trim().toLowerCase();

    // Fast OTP lookup
    const { data: otpRecord, error: fetchError } = await supabase
      .from('password_reset_otps')
      .select('expires_at')
      .eq('email', emailLower)
      .eq('otp_code', code)
      .eq('used', false)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Quick expiry check
    if (new Date(otpRecord.expires_at) < new Date()) {
      supabase.from('password_reset_otps').delete().eq('email', emailLower); // Fire and forget
      return new Response(JSON.stringify({ error: "Code expired" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify-only mode - return immediately
    if (verifyOnly) {
      return new Response(JSON.stringify({ success: true, verified: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Full reset
    if (!newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be 6+ characters" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Find user using listUsers as fallback since getUserByEmail is failing
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Auth Admin Error: ${listError.message}`);
    }

    const user = users.find(u => u.email?.toLowerCase() === emailLower);

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update password and mark OTP used
    const [updateResult, _] = await Promise.all([
      supabase.auth.admin.updateUserById(user.id, { password: newPassword }),
      supabase.from('password_reset_otps').update({ used: true }).eq('email', emailLower)
    ]);

    if (updateResult.error) {
      return new Response(JSON.stringify({ error: `Password update failed: ${updateResult.error.message}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Cleanup (fire and forget)
    supabase.from('password_reset_otps').delete().eq('email', emailLower);

    return new Response(JSON.stringify({ success: true, message: "Password reset" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("Fatal Error in reset-password-with-otp:", e);
    return new Response(JSON.stringify({ error: e.message || "An unexpected error occurred" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
