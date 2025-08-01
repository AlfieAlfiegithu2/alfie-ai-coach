import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { audio, prompt, speakingPart, questionTranscription } = await req.json();

    if (!audio) {
      throw new Error('No audio data provided');
    }

    // First, transcribe the audio
    const formData = new FormData();
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', blob, 'speech.webm');
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      throw new Error(`Transcription failed: ${await transcriptionResponse.text()}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcription = transcriptionResult.text;

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

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
        temperature: 0.3,
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${await analysisResponse.text()}`);
    }

    const analysisResult = await analysisResponse.json();
    const analysis = analysisResult.choices[0].message.content;

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
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});