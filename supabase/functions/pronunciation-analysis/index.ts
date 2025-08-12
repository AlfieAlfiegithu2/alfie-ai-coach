import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to robustly extract a JSON object from a string (removes fences if present)
function extractJson(text: string): { jsonText: string; parsed: any | null } {
  try {
    // Remove markdown fences if any
    let t = text.trim();
    if (t.startsWith('```')) {
      t = t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    }
    // Fallback: slice between first { and last }
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      const candidate = t.slice(first, last + 1);
      try { return { jsonText: candidate, parsed: JSON.parse(candidate) }; } catch {}
    }
    // Direct parse attempt
    return { jsonText: t, parsed: JSON.parse(t) };
  } catch {
    return { jsonText: text, parsed: null };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { audio, referenceText } = await req.json();

    if (!audio) throw new Error('No audio data provided');
    if (!referenceText) throw new Error('referenceText is required');

    // Decode base64 to bytes
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    // Transcribe with Whisper
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', blob, 'speech.webm');
    formData.append('model', 'whisper-1');
    // Force English-only transcription to prevent incorrect language auto-detection
    formData.append('language', 'en');
    formData.append('temperature', '0');
    formData.append('prompt', 'Transcribe strictly in English (en-US). This is an IELTS Speaking/pronunciation task. Ignore non-English words and output the best English interpretation.');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      throw new Error(`Transcription failed: ${await transcriptionResponse.text()}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    let userTranscript = transcriptionResult.text || '';

    // Retry guard: if Hangul characters detected, retry with stronger English bias
    const hangulRegex = /[\u3131-\u318E\uAC00-\uD7A3]/;
    if (hangulRegex.test(userTranscript)) {
      console.warn('⚠️ Hangul detected in transcription; retrying with stronger English bias');
      const retryForm = new FormData();
      retryForm.append('file', blob, 'speech.webm');
      retryForm.append('model', 'whisper-1');
      retryForm.append('language', 'en');
      retryForm.append('temperature', '0');
      retryForm.append('prompt', 'TRANSCRIBE ONLY IN ENGLISH (en-US). This is an IELTS Speaking/pronunciation task; even if audio includes non-English sounds, output the closest English words only.');
      const retryResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: retryForm,
      });
      if (retryResp.ok) {
        const retryJson = await retryResp.json();
        if (retryJson?.text) userTranscript = retryJson.text;
      } else {
        console.error('Retry transcription failed:', await retryResp.text());
      }
    }

    // Build Prolo prompt
    const instructions = `Role and Goal:
You are 'Prolo', an expert AI pronunciation coach and IELTS examiner. Your primary mission is to perform a detailed analysis of a user's spoken English audio. You will compare the user's speech to a correct reference sentence. Your evaluation uses a 0 to 100 scoring system.

Context & Inputs:
[REFERENCE_TEXT]: "${referenceText}"
[USER_AUDIO_TRANSCRIPT]: "${userTranscript}"

Task:
Analyze pronunciation and delivery ONLY, focusing on:
1) Phonetic Accuracy
2) Word Stress
3) Sentence Stress & Rhythm
4) Intonation & Pitch
5) Connected Speech & Fluency

Output Format:
Return ONLY a single valid JSON object, no markdown, no extra text, following exactly:
{
  "overallScore": <0-100>,
  "overallSummary": "<Two-sentence summary>",
  "wordAnalysis": [
    {
      "word": "<word from reference>",
      "userPronunciation": "<how it sounded/appeared>",
      "status": "Excellent|Good|Minor Issue|Incorrect",
      "feedback": "<specific feedback if any>"
    }
  ],
  "detailedFeedback": [
    {
      "area": "Phonetic Accuracy",
      "score": <0-100>,
      "positive": "<what went well>",
      "improvement": "<specific, actionable advice>"
    },
    {
      "area": "Word & Sentence Stress",
      "score": <0-100>,
      "positive": "<what went well>",
      "improvement": "<specific advice on stress and rhythm>"
    },
    {
      "area": "Intonation & Pitch",
      "score": <0-100>,
      "positive": "<what went well>",
      "improvement": "<specific advice on pitch>"
    },
    {
      "area": "Connected Speech & Fluency",
      "score": <0-100>,
      "positive": "<what went well>",
      "improvement": "<specific advice on linking and flow>"
    }
  ]
}

Constraints:
- Base your judgment primarily on the transcript provided; do not include any content outside the JSON object.
- Iterate through each word in the reference text for wordAnalysis, even if pronounced correctly (mark as Excellent/Good/etc.).
- Be concise, specific, and actionable.`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: "You are Prolo, an expert AI pronunciation coach. Always respond with a single JSON object only." },
          { role: 'user', content: instructions }
        ],
        temperature: 0.2,
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${await analysisResponse.text()}`);
    }

    const analysisResult = await analysisResponse.json();
    let analysisText: string = analysisResult.choices?.[0]?.message?.content ?? '';

    // Ensure it's pure JSON text and parseable
    const { jsonText, parsed } = extractJson(analysisText);
    analysisText = jsonText;

    return new Response(
      JSON.stringify({
        transcription: userTranscript,
        analysis: analysisText,
        analysis_json: parsed,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Pronunciation analysis error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
