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

    const { audio, prompt, speakingPart } = await req.json();

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
    const analysisPrompt = `You are an expert IELTS Speaking examiner and phonetics specialist. Analyze this IELTS Speaking ${speakingPart} response comprehensively.

PROMPT: ${prompt}

STUDENT RESPONSE: "${transcription}"

Provide detailed analysis in the following format:

**TRANSCRIPTION ACCURACY**: [Rate 1-10 and note any unclear pronunciations]

**PRONUNCIATION ANALYSIS**:
- Overall clarity: [Rate 1-10]
- Problem sounds: [List specific sounds/phonemes that need work]
- Word stress patterns: [Identify incorrect stress]
- Connected speech: [Analyze linking, elision, assimilation]

**INTONATION & RHYTHM**:
- Natural intonation: [Rate 1-10, describe patterns]
- Sentence stress: [Identify issues]
- Rhythm and pace: [Too fast/slow, choppy/smooth]

**FLUENCY INDICATORS**:
- Hesitations and fillers: [Count and type]
- Self-corrections: [Note frequency]
- Repetitions: [Identify patterns]
- Overall flow: [Rate 1-10]

**ACCENT INFLUENCE**:
- Native language interference: [Identify L1 patterns]
- Intelligibility impact: [Rate 1-10]
- Specific accent features: [List observable characteristics]

**IELTS SPEAKING CRITERIA**:
- Fluency & Coherence: [Band score 4-9 with justification]
- Lexical Resource: [Band score 4-9 with justification]
- Grammatical Range: [Band score 4-9 with justification]
- Pronunciation: [Band score 4-9 with justification]

**PREDICTED BAND SCORE**: [Overall band with explanation]

**SPECIFIC IMPROVEMENT RECOMMENDATIONS**:
1. [Immediate focus area with practice suggestions]
2. [Second priority with specific exercises]
3. [Long-term development goals]

**PRACTICE EXERCISES**:
- [3-5 specific exercises targeting identified weaknesses]

Be specific, constructive, and provide actionable feedback that helps improve performance.`;

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
            content: 'You are an expert IELTS examiner specializing in pronunciation, phonetics, and accent analysis. Provide detailed, professional feedback.'
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