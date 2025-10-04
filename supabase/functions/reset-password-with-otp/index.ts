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
    const { email, code, newPassword } = await req.json();
    
    if (!email || !code || !newPassword) {
      throw new Error("Email, code, and new password are required");
    }

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify OTP
    const { data: otpData, error: otpError } = await admin
      .from('email_otps')
      .select('id, expires_at, purpose')
      .eq('email', email)
      .eq('code', code)
      .eq('purpose', 'password_reset')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpData) {
      throw new Error('Invalid or expired reset code');
    }

    if (new Date(otpData.expires_at).getTime() < Date.now()) {
      throw new Error('Reset code has expired');
    }

    // Get user by email
    const { data: users } = await admin.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === email);

    if (!user) {
      throw new Error('User not found');
    }

    // Update password
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    // Delete used OTP
    await admin.from('email_otps').delete().eq('email', email).eq('code', code);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
