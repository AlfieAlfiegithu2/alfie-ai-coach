// Supabase Edge Function: gemini-tts-speech
// Uses Gemini 2.5 Flash Preview TTS for natural sounding speech
// Based on official Gemini API documentation: https://ai.google.dev/gemini-api/docs/speech-generation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { text, voice = "Kore" } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "text required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Use the provided API key directly
    const GEMINI_API_KEY = "AIzaSyB4b-vDRpqbEZVMye8LBS6FugK1Wtgm1Us";

    console.log("✅ Using provided GEMINI_API_KEY");
    console.log(`📝 Generating TTS with Gemini 2.5 Flash Preview TTS (voice: ${voice}): "${text.substring(0, 50)}..."`);

    // Call Gemini 2.5 Flash Preview TTS API (official model for TTS)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: text,
                },
              ],
            },
          ],
          generationConfig: {
            response_modalities: ["audio"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: voice, // Official voices: Kore, Puck, Zephyr, Charon, etc.
                },
              },
            },
          },
        }),
      }
    );

    console.log(`📡 Gemini TTS response status: ${geminiResponse.status}`);

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error("❌ Gemini TTS API error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate speech",
          details: error
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const data = await geminiResponse.json();
    
    // Extract audio from response (use inlineData, not inline_data)
    const audioContent = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioContent) {
      console.error("❌ No audio content in Gemini response");
      return new Response(
        JSON.stringify({ error: "No audio content returned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ Audio generated successfully with Gemini 2.5 Flash Preview TTS");

    // Return as base64 WAV audio
    return new Response(
      JSON.stringify({
        audioContent, // Already base64 encoded from Gemini
        text,
        voice,
        mimeType: "audio/wav", // Gemini TTS returns WAV format
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("❌ Error in gemini-tts-speech:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: String(error)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
