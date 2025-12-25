import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to return error responses that frontend can parse
function errorResponse(message: string, headers: Record<string, string>) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code, newPassword, verifyOnly } = await req.json();

    if (!email || !code) {
      return errorResponse("Email and code are required", corsHeaders);
    }

    if (!verifyOnly && !newPassword) {
      return errorResponse("New password is required", corsHeaders);
    }

    if (!verifyOnly && newPassword.length < 6) {
      return errorResponse("Password must be at least 6 characters", corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify OTP from our custom table
    const { data: otpRecord, error: fetchError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', code)
      .eq('used', false)
      .single();

    if (fetchError || !otpRecord) {
      console.error("OTP verification failed:", fetchError);
      return errorResponse("Invalid or expired reset code. Please request a new one.", corsHeaders);
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Clean up expired OTP
      await supabase
        .from('password_reset_otps')
        .delete()
        .eq('email', email.toLowerCase());

      return errorResponse("Reset code has expired. Please request a new one.", corsHeaders);
    }

    // If we only want to verify the code exists and is valid, return now
    if (verifyOnly) {
      return new Response(JSON.stringify({
        success: true,
        message: "Code verified successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark OTP as used
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', email.toLowerCase());

    // Find the user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const user = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return errorResponse("User not found. Please check your email address.", corsHeaders);
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return errorResponse("Failed to update password. Please try again.", corsHeaders);
    }

    // Clean up used OTP
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('email', email.toLowerCase());

    console.log(`Password reset successful for: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in reset-password-with-otp:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred. Please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

