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
      const studentTranscription = transcriptionResult.text;
      console.log(`✅ Transcription complete for ${recording.part}:`, studentTranscription.substring(0, 100) + '...');

      // Individual question analysis prompt for detailed feedback
      const questionPrompt = `You are a senior, highly experienced IELTS examiner. Listen to this student's response to the question: "${recording.questionTranscription || recording.prompt}"

Student's response: ${studentTranscription}

Please provide genuine, conversational feedback as if you're speaking directly to the student. Focus on what you noticed about their speaking performance for this specific answer. Consider their fluency, pronunciation, vocabulary use, and overall delivery. 

Write your feedback in a natural, encouraging tone without using categories or bullet points. Keep it to 2-3 sentences that give specific, actionable insights about their performance on this question.`;

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
              content: 'You are a friendly but experienced IELTS Speaking examiner. Give natural, conversational feedback that feels like genuine advice from a teacher. Avoid robotic categories and be encouraging while being honest about areas for improvement.'
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
      const feedback = analysisResult.choices[0].message.content;
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

    // Create comprehensive analysis prompt
    const comprehensivePrompt = `You are a senior IELTS examiner providing overall feedback on this student's complete Speaking test. Here's what they said across all parts:

${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
`).join('\n')}

Please evaluate their overall performance and provide:

1. Individual band scores (0-9) for:
   - Fluency & Coherence
   - Lexical Resource  
   - Grammatical Range & Accuracy
   - Pronunciation

2. Calculate the overall band score using IELTS rounding rules:
   - .25 rounds UP to next half-band (6.25 → 6.5)
   - .75 rounds UP to next whole band (6.75 → 7.0)
   - Other values round to nearest half-band

3. Write genuine, encouraging feedback that sounds like a real teacher talking to their student. Include specific examples from their responses and practical advice for improvement.

Format your response exactly like this:

FLUENCY_COHERENCE: [score]
LEXICAL_RESOURCE: [score]
GRAMMATICAL_RANGE: [score]
PRONUNCIATION: [score]
OVERALL_BAND_SCORE: [calculated score]
COMPREHENSIVE_FEEDBACK: [Your natural, conversational feedback without categories or formatting - just genuine advice like you're talking to the student face-to-face]`;

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
            content: 'You are an experienced IELTS examiner who gives helpful, genuine feedback. Analyze the complete test performance and provide natural, encouraging advice. Avoid robotic categories and speak like a supportive teacher.'
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