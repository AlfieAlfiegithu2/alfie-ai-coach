import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  verifyJWT,
  checkRateLimit,
  incrementAPICallCount,
  validateInputSize,
  getSecureCorsHeaders
} from "../rate-limiter-utils.ts";

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
      try { return { jsonText: candidate, parsed: JSON.parse(candidate) }; } catch { }
    }
    // Direct parse attempt
    return { jsonText: t, parsed: JSON.parse(t) };
  } catch {
    return { jsonText: text, parsed: null };
  }
}

async function transcribeWithAssemblyAI(audioBase64: string): Promise<string> {
  const assemblyApiKey = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!assemblyApiKey) {
    throw new Error('AssemblyAI API key not configured');
  }

  // Upload audio to AssemblyAI
  const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'authorization': assemblyApiKey,
      'content-type': 'application/octet-stream',
    },
    body: audioBytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(`AssemblyAI upload failed: ${await uploadResponse.text()}`);
  }

  const { upload_url } = await uploadResponse.json();

  // Start transcription
  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'authorization': assemblyApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      language_code: 'en'
    }),
  });

  if (!transcriptResponse.ok) {
    throw new Error(`AssemblyAI transcript request failed: ${await transcriptResponse.text()}`);
  }

  const { id } = await transcriptResponse.json();

  // Poll for completion
  let transcriptData;
  do {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { 'authorization': assemblyApiKey },
    });
    transcriptData = await statusResponse.json();
  } while (transcriptData.status === 'queued' || transcriptData.status === 'processing');

  if (transcriptData.status === 'error') {
    throw new Error(`AssemblyAI transcription failed: ${transcriptData.error}`);
  }

  return transcriptData.text || '';
}

serve(async (req: any) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getSecureCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization');
    const user = await verifyJWT(authHeader);

    if (!user.isValid) {
      console.error('❌ Authentication failed for pronunciation-analysis');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required. Please log in first.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check Input Size
    const clone = req.clone();
    const bodyJson = await clone.json();
    const sizeCheck = validateInputSize(bodyJson, 15360); // 15MB limit

    if (!sizeCheck.isValid) {
      return new Response(JSON.stringify({
        success: false,
        error: sizeCheck.error
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Check Rate Limit
    const quota = await checkRateLimit(user.userId, user.planType);
    if (quota.isLimited) {
      console.error(`❌ Rate limit exceeded for user ${user.userId}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'You have exceeded your daily API limit.',
        remaining: 0,
        resetTime: new Date(quota.resetTime).toISOString(),
        isPremium: user.planType === 'premium'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const { audio, referenceText } = bodyJson;

    if (!audio) throw new Error('No audio data provided');
    if (!referenceText) throw new Error('referenceText is required');

    // Transcribe with AssemblyAI
    const userTranscript = await transcribeWithAssemblyAI(audio);

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

    const analysisResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: "You are Prolo, an expert AI pronunciation coach. Always respond with a single JSON object only." },
          { role: 'user', content: instructions }
        ],
        max_tokens: 1200,
        temperature: 0.3
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

    // 4. Track Successful Call
    await incrementAPICallCount(user.userId);

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
      JSON.stringify({ error: (error as any).message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});