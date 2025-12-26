// @ts-ignore
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// @ts-ignore
declare const Deno: any;
import {
  verifyJWT,
  checkRateLimit,
  incrementAPICallCount,
  validateInputSize,
  getSecureCorsHeaders
} from "../rate-limiter-utils.ts";

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
      console.error('❌ Authentication failed for speech-analysis');
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

    const { audio, prompt, speakingPart, questionTranscription } = bodyJson;

    if (!audio) {
      throw new Error('No audio data provided');
    }

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      console.error('❌ DeepSeek API key not configured for speech analysis. Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({
        success: false,
        error: 'Speech analysis service temporarily unavailable. Please try again in a moment.',
        details: 'DeepSeek API key not configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ DeepSeek API key found for speech analysis, length:', deepseekApiKey.length);

    // Transcribe the audio using AssemblyAI
    console.log('🎤 Transcribing audio...');
    const transcription = await transcribeWithAssemblyAI(audio);

    // Analyze the transcription with advanced prompting
    const analysisPrompt = `You are a senior, highly experienced IELTS examiner. Your goal is to provide a holistic and accurate assessment based *only* on the official IELTS band descriptors and scoring rules provided below. Evaluate the student's response against these criteria and justify your feedback by referencing them.

Focus on overall communicative effectiveness. Do not just count errors; explain their impact on the band score for a specific criterion.

You will first provide a whole number band score (0-9) for each of the four criteria. Then, you will calculate the Overall Band Score according to the specific rounding rules provided at the end.

Now, please assess the following submission against the relevant band descriptors:

ORIGINAL QUESTION: "${questionTranscription || prompt}"

STUDENT RESPONSE: "${transcription}"

[-- IELTS SPEAKING BAND DESCRIPTORS --]

Fluency and Coherence:

Band 9: Speaks fluently with only rare, content-related hesitation.
Band 8: Speaks fluently with only occasional repetition or self-correction.
Band 7: Speaks at length without noticeable effort; may have some language-related hesitation.
Band 6: Is willing to speak at length, though may lose coherence at times.
Band 5: Usually maintains a flow of speech, but uses repetition and self-correction to keep going.
Band 4: Cannot respond without noticeable pauses.
Band 3: Speaks with long pauses.
Band 2: Pauses for long periods before most words.

Lexical Resource (Vocabulary):

Band 9: Uses vocabulary with full flexibility and precision.
Band 8: Uses a wide vocabulary resource readily and flexibly.
Band 7: Discusses a variety of topics flexibly; uses some less common vocabulary.
Band 6: Has a wide enough vocabulary to discuss topics at length.
Band 5: Manages to talk about topics but with limited flexibility.
Band 4: Can only convey basic meaning on familiar topics.
Band 3: Uses simple vocabulary to convey personal information.
Band 2: Only produces isolated utterances.

Grammatical Range and Accuracy:

Band 9: Uses a full range of structures naturally and accurately.
Band 8: Uses a wide range of structures flexibly; majority of sentences are error-free.
Band 7: Uses a range of complex structures with some flexibility.
Band 6: Uses a mix of simple and complex structures, but with limited flexibility.
Band 5: Produces basic sentence forms with reasonable accuracy.
Band 4: Produces basic sentence forms but with frequent errors.
Band 3: Attempts basic sentence forms but with only rare success.
Band 2: Cannot produce basic sentence forms.

Pronunciation:

Band 9: Is effortless to understand.
Band 8: Is easy to understand; accent has minimal effect on intelligibility.
Band 7: Is generally easy to understand, but accent influences sounds at times.
Band 6: Is generally intelligible, but mispronunciation reduces clarity at times.
Band 5: Shows features of Band 4 but with some mixed control.
Band 4: Is often unintelligible.
Band 3: Speech is often unintelligible.
Band 2: Speech is largely unintelligible.

**Final Score Calculation Rules (CRITICAL):**

After you have determined the individual band scores (whole numbers from 0-9) for each of the four criteria, you must calculate the Overall Band Score.

1. Calculate the average of the four criteria scores.
2. You must then apply the official IELTS rounding rules to this average:
   * If the average ends in .25, you must round it UP to the next half-band (e.g., an average of 6.25 becomes an Overall Score of 6.5).
   * If the average ends in .75, you must round it UP to the next whole band (e.g., an average of 6.75 becomes an Overall Score of 7.0).
   * For all other values, round to the nearest whole or half-band as normal.

Please return your assessment in the following structured format:

**FLUENCY & COHERENCE**: [Band Score 0-9 with detailed justification]
**LEXICAL RESOURCE**: [Band Score 0-9 with detailed justification]
**GRAMMATICAL RANGE & ACCURACY**: [Band Score 0-9 with detailed justification]
**PRONUNCIATION**: [Band Score 0-9 with detailed justification]
**OVERALL BAND SCORE**: [Final calculated score following the rounding rules above]
**DETAILED FEEDBACK**: [Comprehensive analysis with specific examples and improvement recommendations]

Be specific, constructive, and provide actionable feedback that helps achieve higher band scores.`;

    const analysisResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a senior IELTS Speaking examiner with comprehensive knowledge of official band descriptors. Follow the assessment criteria and scoring rules provided in the user prompt exactly. Use the official IELTS 0-9 band scale and apply the precise rounding rules for calculating the overall band score.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${await analysisResponse.text()}`);
    }

    const analysisResult = await analysisResponse.json();
    const analysis = analysisResult.choices[0].message.content;

    // 4. Track Successful Call
    await incrementAPICallCount(user.userId);

    return new Response(
      JSON.stringify({
        transcription,
        analysis,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Speech analysis error:', error);
    return new Response(
      JSON.stringify({
        error: (error as any).message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});