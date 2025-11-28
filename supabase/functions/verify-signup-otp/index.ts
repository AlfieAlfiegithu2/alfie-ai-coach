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
    
    if (!email) throw new Error("Email is required");
    if (!otp) throw new Error("Verification code is required");
    if (!password) throw new Error("Password is required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify OTP from database
    const { data: otpRecord, error: fetchError } = await admin
      .from('signup_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', otp)
      .eq('used', false)
      .single();

    if (fetchError || !otpRecord) {
      throw new Error("Invalid or expired verification code");
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      throw new Error("Verification code has expired. Please request a new one.");
    }

    // Mark OTP as used
    await admin
      .from('signup_otps')
      .update({ used: true })
      .eq('email', email.toLowerCase());

    // Check if user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      // User exists, update their password
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || existingUser.user_metadata?.full_name
        }
      });

      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }
      userId = existingUser.id;
    } else {
      // Create new user with confirmed email
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || ''
        }
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }
      userId = newUser.user.id;
    }

    // Update or create profile
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName || '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.warn("Profile update warning:", profileError.message);
      // Don't fail on profile error
    }

    // Generate a session for the user
    // Note: We can't directly create a session from edge function,
    // so we return success and let the client sign in
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

