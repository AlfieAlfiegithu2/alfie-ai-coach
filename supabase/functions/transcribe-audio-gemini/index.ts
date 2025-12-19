import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "./cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { audioUrl } = await req.json();

    if (!audioUrl) {
      throw new Error("Missing audioUrl");
    }

    console.log("Processing audio from URL:", audioUrl);

    // 1. Download the Audio
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error("Failed to download audio file");

    // 2. Convert to Base64
    const audioBlob = await audioResponse.blob();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Efficient base64 conversion for Deno
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    console.log("Audio downloaded. Size:", audioBlob.size, "Base64 Length:", base64Audio.length);

    // 3. Call Gemini 1.5 Flash
    // Using gemini-1.5-flash for speed and multimodal capabilities
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
      You are a specialized transcription AI.
      Task: Transcribe the following audio file verbatim.
      Format: Strict JSON array of objects.
      Schema: 
      [
        {
          "start": <number (seconds)>,
          "end": <number (seconds)>,
          "text": "<string>"
        }
      ]
      
      Requirements:
      - Start and End times must be accurate numbers (e.g., 1.5, 12.0).
      - "text" must be the exact spoken words.
      - Do not include any markdown formatting (like \`\`\`json).
      - Break segments by sentences or natural pauses (approx 5-10 seconds max per segment).
    `;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "audio/mp3", // Generally works for mp3/wav/etc in Gemini
              data: base64Audio
            }
          }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    console.log("Sending payload to Gemini...");
    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini Error:", JSON.stringify(data));
      throw new Error(`Gemini API Error: ${data.error?.message || 'Unknown'}`);
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error("No content in Gemini response:", JSON.stringify(data));
      throw new Error("No transcript generated");
    }

    console.log("Gemini response received. Parsing JSON...");

    // Clean up potential markdown formatting if Gemini ignored the system prompt about plain JSON
    let cleanJson = generatedText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "");
    }

    let transcript;
    try {
      transcript = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error. Raw text:", generatedText);
      throw new Error("Failed to parse Gemini response as JSON");
    }

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in transcribe-audio-gemini:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});