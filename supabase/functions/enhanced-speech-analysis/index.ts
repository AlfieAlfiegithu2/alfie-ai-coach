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
    console.log('🚀 Enhanced speech analysis started');
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { allRecordings, testData, analysisType = "comprehensive" } = await req.json();
    
    console.log('📊 Received data:', {
      recordingsCount: allRecordings?.length || 0,
      hasTestData: !!testData,
      analysisType
    });

    if (!allRecordings || allRecordings.length === 0) {
      throw new Error('No recording data provided');
    }

    // Process individual question analyses first (direct audio analysis)
    console.log('🎯 Starting individual question analyses...');
    const individualAnalyses = await Promise.all(allRecordings.map(async (recording: any, index: number) => {
      console.log(`🎤 Processing recording ${index + 1}/${allRecordings.length}:`, {
        part: recording.part,
        partNum: recording.partNum,
        questionIndex: recording.questionIndex,
        hasAudio: !!recording.audio_base64,
        questionText: recording.questionTranscription?.substring(0, 50) + '...'
      });
      const binaryString = atob(recording.audio_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, `speech_part${recording.partNum}_q${recording.questionIndex}.webm`);
      formData.append('model', 'whisper-1');
      // Force English-only transcription to prevent incorrect language auto-detection
      formData.append('language', 'en');
      formData.append('temperature', '0');
      formData.append('prompt', "Transcribe strictly in English (en-US). This is an IELTS Speaking test answer. Mark any unintelligible segments as 'inaudible'.");

      // Get transcription for this individual question
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error(`❌ Transcription failed for ${recording.part}:`, errorText);
        throw new Error(`Transcription failed for ${recording.part}: ${errorText}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      let studentTranscription = transcriptionResult.text || '';

      // Retry guard: if Hangul characters detected, retry with stronger English bias
      const hangulRegex = /[\u3131-\u318E\uAC00-\uD7A3]/;
      if (hangulRegex.test(studentTranscription)) {
        console.warn('⚠️ Hangul detected in transcription; retrying with stronger English bias');
        const retryForm = new FormData();
        retryForm.append('file', blob, `speech_part${recording.partNum}_q${recording.questionIndex}.webm`);
        retryForm.append('model', 'whisper-1');
        retryForm.append('language', 'en');
        retryForm.append('temperature', '0');
        retryForm.append('prompt', 'TRANSCRIBE ONLY IN ENGLISH (en-US). This is an IELTS Speaking test; even if audio includes non-English sounds, output the closest English words only.');
        const retryResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
          body: retryForm,
        });
        if (retryResp.ok) {
          const retryJson = await retryResp.json();
          if (retryJson?.text) studentTranscription = retryJson.text;
        } else {
          console.error('Retry transcription failed:', await retryResp.text());
        }
      }

      console.log(`✅ Transcription complete for ${recording.part}:`, studentTranscription.substring(0, 100) + '...');

    // Check for empty, silent, or minimal responses and score accordingly
    const isMinimalResponse = !studentTranscription || 
                            studentTranscription.trim().length < 5 ||
                            /^(silence|\.{3,}|bye\.?|mm|uh|um|er)$/i.test(studentTranscription.trim()) ||
                            studentTranscription.toLowerCase().includes('silence');

    let feedback;
    if (isMinimalResponse) {
      feedback = `This response shows no substantive content. For IELTS Speaking, candidates must provide extended responses that address the question. A complete absence of meaningful speech results in the lowest possible scores across all criteria. To improve, practice speaking for the full allocated time with relevant content, clear pronunciation, and appropriate vocabulary.`;
    } else {
      // Individual question analysis prompt for detailed feedback
      const questionPrompt = `You are a senior, highly experienced IELTS examiner. You will analyze the following audio recording of a student's answer to an IELTS Speaking question. The question asked was: "${recording.questionTranscription || recording.prompt}"

Listen to the student's audio response. Then, provide a detailed, holistic assessment focusing on the key speaking criteria. Your feedback must go beyond the words used. Analyze the following:

Student's Transcribed Response: ${studentTranscription}

Fluency and Coherence: How was the flow and pace? Were there unnatural pauses or hesitation? Did they use filler words?

Pronunciation: How clear was their speech? Were there any specific words or sounds that were difficult to understand?

Intonation and Delivery: Did their voice sound natural and engaging, or was it monotonous? Did they use stress and intonation to convey meaning effectively?

Lexical Resource and Grammatical Accuracy: Briefly comment on their vocabulary and grammar in this specific answer.

Return your feedback as a concise, bulleted list of 2-3 key points.`;

      if (!isMinimalResponse) {
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
          const errorText = await analysisResponse.text();
          console.error(`❌ Individual analysis failed for ${recording.part}:`, errorText);
          throw new Error(`Individual analysis failed: ${errorText}`);
        }

        const analysisResult = await analysisResponse.json();
        feedback = analysisResult.choices[0].message.content;
      }
    }
      console.log(`✅ Individual analysis complete for ${recording.part}:`, feedback.substring(0, 100) + '...');
      
      return {
        part: recording.part,
        partNumber: recording.partNum,
        questionIndex: recording.questionIndex,
        questionText: recording.questionTranscription || recording.prompt,
        transcription: studentTranscription,
        feedback: feedback,
        audio_url: recording.audio_url
      };
    }));

    console.log(`🎉 Individual analyses complete! Generated ${individualAnalyses.length} question analyses`);

    // Create overall transcriptions for comprehensive analysis
    const allTranscriptions = individualAnalyses.map(analysis => ({
      part: analysis.part,
      question: analysis.questionText,
      transcription: analysis.transcription,
      partNum: analysis.partNumber,
      questionIndex: analysis.questionIndex
    }));

    // Check if most responses are minimal/silent
    const minimalResponses = allTranscriptions.filter(t => 
      !t.transcription || 
      t.transcription.trim().length < 5 ||
      /^(silence|\.{3,}|bye\.?|mm|uh|um|er)$/i.test(t.transcription.trim()) ||
      t.transcription.toLowerCase().includes('silence')
    );

    let comprehensivePrompt;
    
    // If more than half the responses are minimal, give very low scores
    if (minimalResponses.length > allTranscriptions.length / 2) {
      comprehensivePrompt = `You are a senior IELTS examiner. The student provided mostly silent or extremely minimal responses throughout the test. Most responses were either silence, single words like "bye", or no substantive content.

FULL TEST TRANSCRIPT:
${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
`).join('\n')}

Given the lack of substantive responses across most of the test, you must assign very low band scores (0-2 range) for all criteria. A student who does not speak or provides only minimal responses cannot demonstrate the required speaking abilities.

Please return your assessment in this format:

FLUENCY & COHERENCE: [0-2] - [Explanation of why minimal/no response results in lowest scores]
LEXICAL RESOURCE: [0-2] - [Explanation of limited/no vocabulary demonstrated]
GRAMMATICAL RANGE & ACCURACY: [0-2] - [Explanation of lack of grammatical demonstration]
PRONUNCIATION: [0-2] - [Explanation of minimal speech for assessment]
OVERALL BAND SCORE: [0-2]
COMPREHENSIVE FEEDBACK: [Brief explanation that substantive responses are required for IELTS Speaking assessment]`;
    } else {
      comprehensivePrompt = `You are a senior, highly experienced IELTS examiner conducting a COMPREHENSIVE FULL-TEST ANALYSIS. Your goal is to provide a holistic and accurate assessment based on the student's COMPLETE performance across ALL parts of the IELTS Speaking test.

IMPORTANT: Base your assessment on the ENTIRE test performance, not just individual questions. Look for patterns, development, and overall communicative effectiveness across all parts.

FULL TEST TRANSCRIPT:

${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
`).join('\n')}

COMPREHENSIVE ANALYSIS INSTRUCTIONS:

Evaluate the student's OVERALL performance across the complete test using these criteria:

Fluency and Coherence (0-9):
- How well did they maintain speech flow throughout ALL parts?
- Did they show improvement or decline across parts?
- Overall coherence and logical development across different question types

Lexical Resource (0-9):
- Range of vocabulary demonstrated across ALL topics and parts
- Flexibility in vocabulary use between different speaking tasks
- Appropriateness of language for different contexts (interview, long turn, discussion)

Grammatical Range and Accuracy (0-9):
- Variety of structures used throughout the complete test
- Accuracy patterns across all responses
- Ability to handle different grammatical demands of each part

Pronunciation (0-9):
- Consistency of pronunciation throughout the entire test
- Intelligibility across all parts and question types
- Impact on communication across the full performance

CRITICAL REQUIREMENTS:
1. Provide specific examples from DIFFERENT parts of the test in your feedback
2. Show how performance varied or remained consistent across parts
3. Give a truly holistic assessment, not just based on one question
4. Reference patterns observed across the complete test

Final Score Calculation Rules:
1. Calculate the average of the four criteria scores
2. Apply official IELTS rounding rules:
   - .25 → round UP to next half-band (6.25 → 6.5)
   - .75 → round UP to next whole band (6.75 → 7.0)
   - All other values round to nearest half-band

Please return your assessment in this format:

FLUENCY & COHERENCE: [Band Score 0-9] - [Detailed justification with examples from multiple parts]
LEXICAL RESOURCE: [Band Score 0-9] - [Detailed justification with examples from multiple parts]
GRAMMATICAL RANGE & ACCURACY: [Band Score 0-9] - [Detailed justification with examples from multiple parts]
PRONUNCIATION: [Band Score 0-9] - [Detailed justification with examples from multiple parts]
OVERALL BAND SCORE: [Final calculated score following rounding rules]
COMPREHENSIVE FEEDBACK: [Holistic analysis showing patterns across all parts, specific examples from different sections, and improvement recommendations based on complete performance]`;
    }

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

    console.log('🎯 Final response data:', {
      transcriptionsCount: allTranscriptions.length,
      individualAnalysesCount: individualAnalyses.length,
      hasOverallAnalysis: !!analysis,
      analysisType: "comprehensive_full_test"
    });

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