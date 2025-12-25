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
    const { email, otp, password, fullName, verifyOnly } = await req.json();
    console.log(`Verification request for ${email}: verifyOnly=${verifyOnly}, fullName=${fullName}`);

    if (!email) throw new Error("Email is required");
    if (!otp) throw new Error("Verification code is required");

    if (!verifyOnly) {
      if (!password) throw new Error("Password is required");
      if (password.length < 6) throw new Error("Password must be at least 6 characters");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify OTP from database
    console.log(`Checking OTP ${otp} for ${email}...`);
    const { data: otpRecord, error: fetchError } = await supabase
      .from('signup_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', otp)
      .eq('used', false)
      .single();

    if (fetchError || !otpRecord) {
      console.log(`OTP fetch error or not found: ${fetchError?.message}`);
      // Check if it's an expired code vs invalid code
      const { data: expiredRecord } = await supabase
        .from('signup_otps')
        .select('id, expires_at')
        .eq('email', email.toLowerCase())
        .eq('otp_code', otp)
        .single();

      if (expiredRecord) {
        if (new Date(expiredRecord.expires_at) < new Date()) {
          throw new Error("Verification code has expired. Please request a new one.");
        }
        throw new Error("Verification code has already been used.");
      }
      throw new Error("Invalid verification code");
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.log(`OTP expired for ${email}`);
      // Mark as expired and clean up
      await supabase
        .from('signup_otps')
        .delete()
        .eq('email', email.toLowerCase());
      throw new Error("Verification code has expired. Please request a new one.");
    }

    // If we only want to verify the code exists and is valid, return now
    if (verifyOnly) {
      console.log(`Code verified successfully (verifyOnly) for ${email}`);
      return new Response(JSON.stringify({
        success: true,
        message: "Code verified successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Finalizing account creation for ${email}...`);

    // Check if user already exists using getUserByEmail (faster than listUsers)
    console.log(`Checking if user ${email} already exists...`);
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    // Ignore 404 errors as they just mean the user doesn't exist yet
    if (userError && userError.status !== 404) {
      console.error("Error checking user existence:", userError);
      throw new Error(`User check failed: ${userError.message}`);
    }

    const existingUser = userData?.user;

    let userId: string;

    if (existingUser) {
      // User exists - update their password and confirm email
      console.log(`Updating existing user: ${existingUser.id}`);
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || existingUser.user_metadata?.full_name
        }
      });

      if (updateError) {
        console.error("Update user error:", updateError);
        throw new Error(`Failed to update account: ${updateError.message}`);
      }
      userId = updatedUser.user.id;
    } else {
      // Create new user with confirmed email
      console.log(`Creating new user for ${email}...`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || ''
        }
      });

      if (createError) {
        console.error("Create user error:", createError);
        throw new Error(`Failed to create account: ${createError.message}`);
      }
      userId = newUser.user.id;
      console.log(`Created new user: ${userId}`);
    }

    // Now that user is created/updated, consume the OTP
    console.log(`Consuming OTP for ${email}...`);
    await supabase
      .from('signup_otps')
      .update({ used: true })
      .eq('email', email.toLowerCase());

    // Parallelize profile update and OTP cleanup
    console.log(`Starting parallel profile update and OTP cleanup for user ${userId}...`);
    const profilePromise = (async () => {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();

        if (!existingProfile) {
          console.log(`Creating profile for ${userId}...`);
          const { error: insertError } = await supabase.from('profiles').insert({
            id: userId,
            full_name: fullName || '',
            role: 'user',
            subscription_status: 'free',
            native_language: 'en'
          });
          if (insertError) console.error("Profile insert error:", insertError);
        } else if (fullName) {
          console.log(`Updating profile for ${userId}...`);
          const { error: updateError } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId);
          if (updateError) console.error("Profile update error:", updateError);
        }
      } catch (err) {
        console.error("Unexpected error in profile operation:", err);
      }
    })();

    const cleanupPromise = (async () => {
      console.log(`Cleaning up OTPs for ${email}...`);
      const { error: deleteError } = await supabase
        .from('signup_otps')
        .delete()
        .eq('email', email.toLowerCase());
      if (deleteError) console.error("OTP cleanup error:", deleteError);
    })();

    await Promise.all([profilePromise, cleanupPromise]);

    console.log(`Account creation completed for ${email}`);
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
