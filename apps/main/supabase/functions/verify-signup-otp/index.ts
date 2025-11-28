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

    // Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", email)
      .eq("code", otp)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      // Check if it expired vs invalid
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

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);
    
    if (userExists) {
      // If user exists but hasn't confirmed email, we could potentially update/confirm them here
      // For now, let's treat it as a duplicate error to keep it simple, or handle sign-in if needed
      // But standard behavior for signup is to fail if exists
      throw new Error("This email is already registered. Please sign in.");
    }

    // Create user with email confirmed
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (createError) {
      console.error("Create user error:", createError);
      throw new Error(createError.message);
    }

    // Delete used OTP
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

