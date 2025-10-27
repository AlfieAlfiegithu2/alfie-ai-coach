// Supabase Edge Function: ai-speaking-session-log
// Stores session summary (duration, transcript, tokens, cost estimate)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const {
      user_id,
      duration_seconds,
      transcript,
      prompt_id,
      tokens_in,
      tokens_out
    } = payload;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase config missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Estimate costs
    // Google TTS: $4 per 1M chars, assume ~300 chars per response, avg 5-10 responses
    const estimatedTtsChars = (tokens_out || 100) * 4; // rough estimate
    const ttsCharCost = 4 / 1000000;
    const estimatedTtsCost = estimatedTtsChars * ttsCharCost;

    // Gemini: $0.075 per 1M input tokens
    const geminiCharCost = 0.075 / 1000000;
    const estimatedGeminiCost = (tokens_in || 0) * geminiCharCost;

    const totalCost = estimatedTtsCost + estimatedGeminiCost;

    // Insert into voice_sessions table
    const { error: insertError } = await supabase
      .from("voice_sessions")
      .insert({
        user_id,
        prompt_id,
        model: "gemini-2.5-flash",
        duration_s: duration_seconds,
        transcript,
        tokens_in: tokens_in || 0,
        tokens_out: tokens_out || 0,
        cost_usd_estimate: totalCost,
      });

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log session" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        duration_seconds,
        cost_estimate: totalCost.toFixed(4)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("session log error", e);
    return new Response(
      JSON.stringify({ error: "failed_to_log" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});


