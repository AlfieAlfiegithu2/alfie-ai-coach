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
    const { email, otp, password, fullName } = await req.json();
    
    if (!email || !otp || !password) {
      throw new Error("Missing required fields");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", email)
      .eq("code", otp)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      // Check if it's just expired vs wrong code
      const { data: expired } = await supabase
        .from("email_otps")
        .select("id")
        .eq("email", email)
        .eq("code", otp)
        .single();
        
      if (expired) {
        throw new Error("Verification code has expired. Please request a new one.");
      }
      throw new Error("Invalid verification code");
    }

    // 2. Check if user already exists
    // We try to create; if it fails with 'User already registered', we throw a friendly error
    // Note: We create user with auto-confirm
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since they verified OTP
      user_metadata: {
        full_name: fullName
      }
    });

    if (createError) {
      console.error("Create user error:", createError);
      throw new Error(createError.message);
    }

    // 3. Cleanup used OTP
    await supabase.from("email_otps").delete().eq("email", email);

    return new Response(JSON.stringify({ 
      success: true, 
      user: user.user 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in verify-signup-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

