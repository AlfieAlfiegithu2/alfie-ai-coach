import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize client outside handler for performance (persists in warm containers)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, password, fullName, verifyOnly } = await req.json();

    if (!email) throw new Error("Email is required");
    if (!otp) throw new Error("Verification code is required");

    // Only require password when not in verify-only mode
    if (!verifyOnly) {
      if (!password) throw new Error("Password is required");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
    }

    const emailLower = email.toLowerCase();

    // Verify OTP from database
    const { data: otpRecord, error: fetchError } = await supabase
      .from('signup_otps')
      .select('*')
      .eq('email', emailLower)
      .eq('otp_code', otp)
      .eq('used', false)
      .single();

    if (fetchError || !otpRecord) {
      throw new Error("Invalid or expired verification code.");
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Mark as expired and clean up (fire and forget for speed)
      supabase.from('signup_otps').delete().eq('email', emailLower);
      throw new Error("Verification code has expired. Please request a new one.");
    }

    // If verify-only mode, return success immediately
    if (verifyOnly) {
      return new Response(JSON.stringify({
        success: true,
        message: "Email verified successfully",
        verified: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark OTP as used
    await supabase
      .from('signup_otps')
      .update({ used: true })
      .eq('email', emailLower);

    // Check if user already exists
    let existingUser = null;
    try {
      const { data: userData } = await supabase.auth.admin.getUserByEmail(emailLower);
      if (userData?.user) {
        existingUser = userData.user;
      }
    } catch (e) {
      console.log("User lookup: not found or other error");
    }

    let userId: string;

    if (existingUser) {
      // User exists - update their password and confirm email
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || existingUser.user_metadata?.full_name
        }
      });

      if (updateError) throw new Error(`Failed to update user: ${updateError.message}`);
      userId = existingUser.id;
    } else {
      // Create new user with confirmed email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || ''
        }
      });

      if (createError) throw new Error(`Failed to create user: ${createError.message}`);
      userId = newUser.user.id;
    }

    // Parallel profile check/create/update for speed
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName || '',
          role: 'user',
          subscription_status: 'free',
          native_language: 'en'
        });
    } else if (fullName) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', userId);
    }

    // Final cleanup (fire and forget)
    supabase.from('signup_otps').delete().eq('email', emailLower);

    return new Response(JSON.stringify({
      success: true,
      message: "Account created successfully",
      userId: userId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error in verify-signup-otp:", e);
    return new Response(JSON.stringify({
      success: false,
      error: (e as Error).message
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
