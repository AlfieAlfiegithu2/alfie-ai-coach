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
    console.log('🚀 Enhanced speech analysis started (using OpenRouter)');

    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterKey) {
      throw new Error('OpenRouter API key not configured');
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

    // Helper to safely extract JSON
    const extractJson = (text: string): any | null => {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}$/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      } catch (_) {
        try {
          const fenced = text.replace(/```(json)?/g, '').trim();
          return JSON.parse(fenced);
        } catch (_) { return null; }
      }
    };

    // Create detailed recording information for the prompt
    const recordingDetails = allRecordings.map((recording: any, index: number) => ({
      index: index + 1,
      part: recording.part,
      partNumber: recording.partNum,
      questionIndex: recording.questionIndex,
      questionText: recording.questionTranscription || recording.prompt || 'No question text available',
      hasAudio: !!recording.audio_base64
    }));

    console.log('📊 Recording details:', recordingDetails);

    // Create comprehensive prompt for AI analysis
    const comprehensivePrompt = recordingDetails.map(detail =>
      `Recording ${detail.index}: ${detail.part} - Question: "${detail.questionText}" - Has Audio: ${detail.hasAudio ? 'Yes' : 'No'}`
    ).join('\n');

    console.log('📝 Comprehensive prompt created:', comprehensivePrompt.substring(0, 200) + '...');

    // Use OpenRouter with Gemini 2.5 Flash for comprehensive analysis
    const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'English Aidol IELTS Speaking Analysis'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-09-2025',
        messages: [
          {
            role: 'user',
            content: `You are a senior IELTS Speaking examiner. Analyze the speaking test performance based on the provided information.

${comprehensivePrompt}

Return detailed analysis in this format:

FLUENCY & COHERENCE: [Band Score 0-9] - [Detailed justification]
LEXICAL RESOURCE: [Band Score 0-9] - [Detailed justification]
GRAMMATICAL RANGE & ACCURACY: [Band Score 0-9] - [Detailed justification]
PRONUNCIATION: [Band Score 0-9] - [Detailed justification]
OVERALL BAND SCORE: [Final calculated score following rounding rules]
COMPREHENSIVE FEEDBACK: [Holistic analysis with specific improvement recommendations]`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        top_p: 0.9
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${await analysisResponse.text()}`);
    }

    const analysisResult = await analysisResponse.json();
    const rawAnalysis = analysisResult.choices?.[0]?.message?.content || '{}';

    // Transform the data to match the expected format for the frontend
    // Create individual analyses for each recording based on the comprehensive analysis
    const individualAnalyses = allRecordings.map((recording, index) => {
      return {
        part: recording.part,
        partNumber: recording.partNum || parseInt(recording.part.replace('part', '')),
        questionIndex: recording.questionIndex || 0,
        questionText: recording.questionTranscription || recording.prompt || `Part ${recording.partNum || parseInt(recording.part.replace('part', ''))} Question`,
        transcription: 'Audio analysis not available - please listen to your recording',
        feedback: 'Analysis completed',
        audio_url: recording.audio_url,
        original_spans: [],
        suggested_spans: [],
        metrics: {
          word_count: 0,
          minimal: false,
          pronunciation_score: 0,
          intonation_score: 0,
          fluency_score: 0,
          grammar_score: 0,
          vocabulary_score: 0,
          overall_band: 0
        }
      };
    });

    // Use the raw analysis response as the analysis text
    const analysisText = rawAnalysis;

    console.log('🎯 Final response data:', {
      recordingsCount: allRecordings.length,
      individualAnalysesCount: individualAnalyses.length,
      hasOverallAnalysis: !!analysisText
    });

    return new Response(
      JSON.stringify({
        transcriptions: individualAnalyses.map(analysis => ({
          part: analysis.part,
          question: analysis.questionText,
          transcription: analysis.transcription,
          partNum: analysis.partNumber,
          questionIndex: analysis.questionIndex,
          audio_url: analysis.audio_url
        })),
        analysis: analysisText,
        individualAnalyses,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in enhanced speech analysis:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
