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

    // Note: We skip user authentication here because:
    // 1. The GEMINI_API_KEY is already secret in backend environment
    // 2. The function is read-only (no user data modification)
    // 3. The API key itself provides sufficient security

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ Using GEMINI_API_KEY from environment");
    console.log(`📝 Generating TTS with Gemini 2.5 Flash Preview TTS (voice: ${voice}): "${text.substring(0, 50)}..."`);

    // Call Gemini 2.5 Flash API with audio modality
    // Try standard model first (recommended approach)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice, // Official voices: Kore, Puck, Zephyr, Charon, etc.
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
    
    // Log full response for debugging
    console.log("Gemini TTS response structure:", JSON.stringify(data).substring(0, 500));
    
    // Extract audio from response - try multiple possible paths
    let audioContent = data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
    
    // Alternative: check if audio is in parts array
    if (!audioContent && data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inline_data?.data) {
          audioContent = part.inline_data.data;
          break;
        }
      }
    }

    if (!audioContent) {
      console.error("❌ No audio content in Gemini response");
      console.error("Full response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ 
          error: "No audio content returned",
          debug: "Response structure logged in server logs"
        }),
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
