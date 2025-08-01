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

    const { allRecordings, testData, analysisType = "comprehensive" } = await req.json();

    if (!allRecordings || allRecordings.length === 0) {
      throw new Error('No recording data provided');
    }

    // Process individual question analyses first (direct audio analysis)
    const individualAnalyses = await Promise.all(allRecordings.map(async (recording: any) => {
      const binaryString = atob(recording.audio_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, `speech_part${recording.partNum}_q${recording.questionIndex}.webm`);
      formData.append('model', 'whisper-1');

      // Get transcription for this individual question
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        throw new Error(`Transcription failed for ${recording.part}: ${await transcriptionResponse.text()}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      const studentTranscription = transcriptionResult.text;

      // Individual question analysis prompt for detailed feedback
      const questionPrompt = `You are a senior, highly experienced IELTS examiner. You will analyze the following audio recording of a student's answer to an IELTS Speaking question. The question asked was: "${recording.questionTranscription || recording.prompt}"

Listen to the student's audio response. Then, provide a detailed, holistic assessment focusing on the key speaking criteria. Your feedback must go beyond the words used. Analyze the following:

**Student's Transcribed Response:** ${studentTranscription}

**Fluency and Coherence:** How was the flow and pace? Were there unnatural pauses or hesitation? Did they use filler words?

**Pronunciation:** How clear was their speech? Were there any specific words or sounds that were difficult to understand?

**Intonation and Delivery:** Did their voice sound natural and engaging, or was it monotonous? Did they use stress and intonation to convey meaning effectively?

**Lexical Resource and Grammatical Accuracy:** Briefly comment on their vocabulary and grammar in this specific answer.

Return your feedback as a concise, bulleted list of 2-3 key points.`;

      const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'You are a senior IELTS Speaking examiner. Provide specific, actionable feedback focusing on audio-based criteria like fluency, pronunciation, and intonation.'
            },
            {
              role: 'user',
              content: questionPrompt
            }
          ],
          temperature: 0.2,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error(`Individual analysis failed: ${await analysisResponse.text()}`);
      }

      const analysisResult = await analysisResponse.json();
      
      return {
        part: recording.part,
        partNumber: recording.partNum,
        questionIndex: recording.questionIndex,
        questionText: recording.questionTranscription || recording.prompt,
        transcription: studentTranscription,
        feedback: analysisResult.choices[0].message.content,
        audio_url: recording.audio_url
      };
    }));

    // Create overall transcriptions for comprehensive analysis
    const allTranscriptions = individualAnalyses.map(analysis => ({
      part: analysis.part,
      question: analysis.questionText,
      transcription: analysis.transcription,
      partNum: analysis.partNumber,
      questionIndex: analysis.questionIndex
    }));

    // Create comprehensive analysis prompt
    const comprehensivePrompt = `You are a senior, highly experienced IELTS examiner conducting a COMPREHENSIVE FULL-TEST ANALYSIS. Your goal is to provide a holistic and accurate assessment based on the student's COMPLETE performance across ALL parts of the IELTS Speaking test.

**IMPORTANT**: Base your assessment on the ENTIRE test performance, not just individual questions. Look for patterns, development, and overall communicative effectiveness across all parts.

**FULL TEST TRANSCRIPT:**

${allTranscriptions.map(t => `
**${t.part} Question:** ${t.question}
**Student Response:** ${t.transcription}
`).join('\n')}

**COMPREHENSIVE ANALYSIS INSTRUCTIONS:**

Evaluate the student's OVERALL performance across the complete test using these criteria:

**Fluency and Coherence (0-9):**
- How well did they maintain speech flow throughout ALL parts?
- Did they show improvement or decline across parts?
- Overall coherence and logical development across different question types

**Lexical Resource (0-9):**
- Range of vocabulary demonstrated across ALL topics and parts
- Flexibility in vocabulary use between different speaking tasks
- Appropriateness of language for different contexts (interview, long turn, discussion)

**Grammatical Range and Accuracy (0-9):**
- Variety of structures used throughout the complete test
- Accuracy patterns across all responses
- Ability to handle different grammatical demands of each part

**Pronunciation (0-9):**
- Consistency of pronunciation throughout the entire test
- Intelligibility across all parts and question types
- Impact on communication across the full performance

**CRITICAL REQUIREMENTS:**
1. Provide specific examples from DIFFERENT parts of the test in your feedback
2. Show how performance varied or remained consistent across parts
3. Give a truly holistic assessment, not just based on one question
4. Reference patterns observed across the complete test

**Final Score Calculation Rules:**
1. Calculate the average of the four criteria scores
2. Apply official IELTS rounding rules:
   - .25 → round UP to next half-band (6.25 → 6.5)
   - .75 → round UP to next whole band (6.75 → 7.0)
   - All other values round to nearest half-band

Please return your assessment in this format:

**FLUENCY & COHERENCE**: [Band Score 0-9] - [Detailed justification with examples from multiple parts]
**LEXICAL RESOURCE**: [Band Score 0-9] - [Detailed justification with examples from multiple parts]
**GRAMMATICAL RANGE & ACCURACY**: [Band Score 0-9] - [Detailed justification with examples from multiple parts]  
**PRONUNCIATION**: [Band Score 0-9] - [Detailed justification with examples from multiple parts]
**OVERALL BAND SCORE**: [Final calculated score following rounding rules]
**COMPREHENSIVE FEEDBACK**: [Holistic analysis showing patterns across all parts, specific examples from different sections, and improvement recommendations based on complete performance]`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a senior IELTS Speaking examiner with comprehensive knowledge of official band descriptors. You must analyze the COMPLETE speaking test performance holistically, providing examples from different parts to support your assessment. Follow the assessment criteria and scoring rules exactly.'
          },
          {
            role: 'user',
            content: comprehensivePrompt
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${await analysisResponse.text()}`);
    }

    const analysisResult = await analysisResponse.json();
    const analysis = analysisResult.choices[0].message.content;

    return new Response(
      JSON.stringify({
        transcriptions: allTranscriptions,
        individualAnalyses,
        analysis,
        analysisType: "comprehensive_full_test",
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Enhanced speech analysis error:', error);
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