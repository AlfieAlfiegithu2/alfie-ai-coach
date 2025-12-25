import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";

const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ASSEMBLYAI_API_KEY) {
      throw new Error("ASSEMBLYAI_API_KEY not configured. Add it in Supabase Dashboard > Edge Functions > Secrets.");
    }

    const { audioUrl } = await req.json();

    if (!audioUrl) {
      throw new Error("Missing audioUrl");
    }

    console.log("🚀 Starting Transcription via AssemblyAI for URL:", audioUrl);

    // Step 1: Submit the transcription request
    // We send the URL directly to AssemblyAI so our function uses NO MEMORY for the audio file.
    const submitResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_detection: true,
        punctuate: true,
        format_text: true
      }),
    });

    const submitData = await submitResponse.json();

    if (!submitResponse.ok) {
      console.error("❌ AssemblyAI Submission Error:", submitData);
      throw new Error(`AssemblyAI Error: ${submitData.error || 'Unknown error'}`);
    }

    const transcriptId = submitData.id;
    console.log("✅ Transcription Queued. ID:", transcriptId);

    // Step 2: Poll for completion
    let attempts = 0;
    let transcriptData = null;

    // Max 100 attempts (approx 5-10 minutes)
    while (attempts < 100) {
      console.log(`⏳ Checking status... (Attempt ${attempts + 1})`);
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { "Authorization": ASSEMBLYAI_API_KEY },
      });

      transcriptData = await pollResponse.json();

      if (transcriptData.status === "completed") {
        console.log("✅ Transcription Completed!");
        break;
      } else if (transcriptData.status === "error") {
        throw new Error(`AssemblyAI Processing Error: ${transcriptData.error}`);
      }

      // Wait based on file length or fixed interval
      // Longer interval as it progresses
      const waitTime = attempts < 5 ? 3000 : 5000;
      await new Promise(r => setTimeout(r, waitTime));
      attempts++;
    }

    if (!transcriptData || transcriptData.status !== "completed") {
      throw new Error("Transcription timed out or failed.");
    }

    // Step 3: Format the response to match IELTS template requirements
    // We need an array of segments with {start, end, text}
    // AssemblyAI provides "utterances" or "sentences" or just the full text.
    // For IELTS, sentences work best.

    // First, try to get sentences
    const sentencesUrl = `https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`;
    const sentencesResponse = await fetch(sentencesUrl, {
      headers: { "Authorization": ASSEMBLYAI_API_KEY },
    });

    const sentencesData = await sentencesResponse.json();

    let transcript = [];
    if (sentencesData.sentences) {
      transcript = sentencesData.sentences.map((s: any) => ({
        start: s.start / 1000, // AssemblyAI uses ms, we want seconds
        end: s.end / 1000,
        text: s.text
      }));
    } else {
      // Fallback if no sentences
      transcript = [{
        start: 0,
        end: transcriptData.audio_duration || 0,
        text: transcriptData.text
      }];
    }

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Transcription Function Error:", error.message);

    return new Response(JSON.stringify({
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});