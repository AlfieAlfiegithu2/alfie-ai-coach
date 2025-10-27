// Supabase Edge Function: google-tts-speech
// Converts text to speech using Google Cloud Text-to-Speech API

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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
    const { text } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "text required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const GOOGLE_CLOUD_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    if (!GOOGLE_CLOUD_API_KEY) {
      console.error("❌ GOOGLE_CLOUD_API_KEY not configured in Supabase secrets");
      return new Response(
        JSON.stringify({ 
          error: "GOOGLE_CLOUD_API_KEY not configured",
          details: "Please set GOOGLE_CLOUD_API_KEY in Supabase Edge Function secrets"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ GOOGLE_CLOUD_API_KEY found");
    console.log(`📝 Converting text to speech: "${text.substring(0, 50)}..."`);

    // Call Google Cloud Text-to-Speech API
    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            text: text.substring(0, 5000), // Limit to 5000 chars per request
          },
          voice: {
            languageCode: "en-US",
            // Use Premium Neural2 voices for natural sounding speech
            // Options: en-US-Neural2-A (male), en-US-Neural2-C (female), en-US-Neural2-E (male), en-US-Neural2-F (female - warm)
            // We use Neural2-F for warmest, most natural female voice
            name: "en-US-Neural2-F", // Warm, natural female voice (premium quality)
          },
          audioConfig: {
            audioEncoding: "MP3",
            pitch: 0,       // Neutral pitch
            speakingRate: 0.95, // Slightly slower for clarity
          },
        }),
      }
    );

    console.log(`📡 Google TTS API response: ${ttsResponse.status}`);

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error("❌ Google TTS API error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to synthesize speech",
          details: error
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const data = await ttsResponse.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      console.error("❌ No audio content in response");
      return new Response(
        JSON.stringify({ error: "No audio content returned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ Audio generated successfully");

    return new Response(
      JSON.stringify({
        audioContent, // Base64 encoded MP3
        text,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("❌ Error in google-tts-speech:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: String(error)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
