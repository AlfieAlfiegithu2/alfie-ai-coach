// This is a Supabase Edge Function that runs on Deno runtime
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini 2.5 handles both transcription and analysis in one call

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced speech analysis started');

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      throw new Error('Gemini API key not configured');
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

      // Use Gemini 2.5 for both transcription and analysis (one call!)
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a senior IELTS examiner. First transcribe the audio exactly as spoken, then analyze it for IELTS Speaking criteria.

AUDIO TRANSCRIPTION:
- Transcribe every word exactly as spoken
- Include filler words like "um", "uh", "like"
- Mark unclear sections as "[inaudible]"
- Note pronunciation issues in brackets like "ed-yoo-kuh-shun [wrong stress]"

SPEAKING ANALYSIS (0-9 scale):
- Pronunciation: Clarity of individual sounds, accent influence, intelligibility
- Intonation: Rising/falling patterns, natural speech rhythm
- Fluency: Hesitation, pausing, speech flow, coherence
- Grammar: Sentence structure and accuracy in speech
- Vocabulary: Word choice and range

ENHANCED ANALYSIS DETAILS:
- Stress Patterns: Identify words with incorrect stress patterns
- Intonation Recommendations: Specific rising/falling tone suggestions
- Phonetic Issues: Target specific sound problems (/θ/, /ð/, /r/, etc.)
- Word Stress: Show correct syllable stress for mispronounced words

Return JSON format:
{
  "transcription": "exact words including fillers and [pronunciation notes]",
  "word_count": 45,
  "pronunciation_score": 6.5,
  "intonation_score": 7.0,
  "fluency_score": 6.0,
  "grammar_score": 7.5,
  "vocabulary_score": 6.5,
  "overall_band": 6.5,
  "feedback_bullets": ["2-3 specific pronunciation improvements", "1-2 intonation tips"],
  "stress_patterns": ["ed-u-CA-tion (stress on 3rd syllable)", "im-POR-tant (stress on 2nd syllable)"],
  "intonation_recommendations": ["Use falling intonation for statements", "Rising tone for questions"],
  "phonetic_focus": ["/θ/ vs /ð/ distinction", "/r/ pronunciation in 'red'"],
  "word_stress_issues": [{"word": "education", "incorrect": "ED-u-ca-tion", "correct": "ed-u-CA-tion"}],
  "original_spans": [{"text": "problem segment", "status": "error"}, {"text": "good segment", "status": "neutral"}],
  "suggested_spans": [{"text": "improved version", "status": "improvement"}],
  "overall_feedback": "Brief analysis of strengths and areas for improvement"
}`
            }, {
              inlineData: {
                data: recording.audio_base64,
                mimeType: 'audio/webm'
              }
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1500,
            topP: 0.9,
            topK: 40
          }
        }),
      });

      if (!geminiResponse.ok) {
        throw new Error(`Gemini transcription/analysis failed: ${await geminiResponse.text()}`);
      }

      const geminiResult = await geminiResponse.json();
      const geminiContent = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const geminiData = extractJson(geminiContent);

      const transcription = geminiData?.transcription || '';
      const wordCount = geminiData?.word_count || 0;
      const isMinimalResponse = !transcription || wordCount < 8 ||
                               /^(silence|\.{3,}|bye\.?|mm|uh|um|er)$/i.test(transcription.trim()) ||
                               transcription.toLowerCase().includes('silence') ||
                               transcription.toLowerCase().includes('inaudible');

      console.log(`✅ Gemini transcription/analysis complete for ${recording.part}:`, transcription.substring(0, 100) + '...');

      let feedback = '';
      let original_spans: any[] = [];
      let suggested_spans: any[] = [];
      let stress_patterns: string[] = [];
      let intonation_recommendations: string[] = [];
      let phonetic_focus: string[] = [];
      let word_stress_issues: any[] = [];

      // Use Gemini response data for feedback and spans
      if (isMinimalResponse) {
        feedback = `This response shows no substantive content. For IELTS Speaking, candidates must provide extended responses that address the question. A complete absence of meaningful speech results in the lowest possible scores across all criteria. To improve, practice speaking for the full allocated time with relevant content, clear pronunciation, and appropriate vocabulary.`;
      } else {
        // Use Gemini's comprehensive analysis
        if (geminiData && Array.isArray(geminiData.feedback_bullets)) {
          feedback = geminiData.feedback_bullets.map((b: string) => `• ${b}`).join('\n');
          original_spans = Array.isArray(geminiData.original_spans) ? geminiData.original_spans : [];
          suggested_spans = Array.isArray(geminiData.suggested_spans) ? geminiData.suggested_spans : [];
          stress_patterns = Array.isArray(geminiData.stress_patterns) ? geminiData.stress_patterns : [];
          intonation_recommendations = Array.isArray(geminiData.intonation_recommendations) ? geminiData.intonation_recommendations : [];
          phonetic_focus = Array.isArray(geminiData.phonetic_focus) ? geminiData.phonetic_focus : [];
          word_stress_issues = Array.isArray(geminiData.word_stress_issues) ? geminiData.word_stress_issues : [];
        } else {
          // Fallback: use Gemini's overall feedback
          feedback = geminiData?.overall_feedback || 'Analysis complete - practice pronunciation and fluency.';
        }
      }

      console.log(`✅ Individual analysis complete for ${recording.part}:`, (feedback || '').substring(0, 100) + '...');
        
      return {
        part: recording.part,
        partNumber: recording.partNum,
        questionIndex: recording.questionIndex,
        questionText: recording.questionTranscription || recording.prompt,
        transcription: transcription,
        feedback,
        audio_url: recording.audio_url,
        original_spans,
        suggested_spans,
        stress_patterns,
        intonation_recommendations,
        phonetic_focus,
        word_stress_issues,
        metrics: {
          word_count: wordCount,
          minimal: isMinimalResponse,
          pronunciation_score: geminiData?.pronunciation_score || 0,
          intonation_score: geminiData?.intonation_score || 0,
          fluency_score: geminiData?.fluency_score || 0,
          grammar_score: geminiData?.grammar_score || 0,
          vocabulary_score: geminiData?.vocabulary_score || 0,
          overall_band: geminiData?.overall_band || 0
        }
      };
    }));

    console.log(`🎉 Individual analyses complete! Generated ${individualAnalyses.length} question analyses`);

    // Create overall transcriptions for comprehensive analysis
    const allTranscriptions = individualAnalyses.map(analysis => ({
      part: analysis.part,
      question: analysis.questionText,
      transcription: analysis.transcription,
      partNum: analysis.partNumber,
      questionIndex: analysis.questionIndex,
      metrics: analysis.metrics,
      stress_patterns: analysis.stress_patterns,
      intonation_recommendations: analysis.intonation_recommendations,
      phonetic_focus: analysis.phonetic_focus,
      word_stress_issues: analysis.word_stress_issues
    }));

    // Enhanced scoring with caps based on response quality
    const minimalResponses = allTranscriptions.filter(t => t.metrics?.minimal);
    const totalWordCount = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.word_count || 0), 0);
    const avgWordsPerResponse = totalWordCount / allTranscriptions.length;
    const coverageRatio = (allTranscriptions.length - minimalResponses.length) / allTranscriptions.length;

    let comprehensivePrompt;
    
    // Fairer scoring based on actual quality, not just length
    if (minimalResponses.length > allTranscriptions.length / 2) {
      // More than half responses are minimal - still low but fairer
      comprehensivePrompt = `You are a senior IELTS examiner. The student provided mostly silent or extremely minimal responses throughout the test.

FULL TEST TRANSCRIPT:
${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
`).join('\n')}

Given the lack of substantive responses, assign low band scores (0-3 range) but consider any speech that was provided. A student with minimal responses can still demonstrate some basic speaking abilities.

Please return your assessment in this format:

FLUENCY & COHERENCE: [0-3] - [Explanation based on minimal speech provided]
LEXICAL RESOURCE: [0-3] - [Explanation of limited vocabulary demonstrated]
GRAMMATICAL RANGE & ACCURACY: [0-3] - [Explanation of basic grammar if any was used]
PRONUNCIATION: [0-3] - [Explanation based on speech clarity where available]
OVERALL BAND SCORE: [0-3]
COMPREHENSIVE FEEDBACK: [Encouraging feedback for improvement]`;
    } else if (avgWordsPerResponse < 15 || coverageRatio < 0.7) {
      // Fairer scoring - quality over quantity (with Gemini analysis)
      const avgPronunciation = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.pronunciation_score || 0), 0) / allTranscriptions.length;
      const avgFluency = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.fluency_score || 0), 0) / allTranscriptions.length;

      comprehensivePrompt = `You are a senior IELTS examiner. The student provided short responses throughout the test.

RESPONSE QUALITY METRICS:
- Average words per response: ${Math.round(avgWordsPerResponse)}
- Coverage ratio: ${Math.round(coverageRatio * 100)}% of questions had substantive answers
- Average pronunciation score: ${avgPronunciation.toFixed(1)}/9.0
- Average fluency score: ${avgFluency.toFixed(1)}/9.0
- Total word count: ${totalWordCount}

FULL TEST TRANSCRIPT (Gemini 2.5 transcription and analysis):
${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
Pronunciation: ${t.metrics?.pronunciation_score || 0}/9 | Fluency: ${t.metrics?.fluency_score || 0}/9
`).join('\n')}

SCORING GUIDANCE: Focus on quality of speech, not just quantity. Gemini 2.5 provides comprehensive audio analysis. Score based on:
- Pronunciation clarity and accuracy (from audio analysis)
- Grammar and vocabulary used
- Fluency and coherence in the responses provided
- Overall communicative effectiveness
- Use individual scores as guidance for overall assessment

Please return your assessment with scores reflecting actual quality:

FLUENCY & COHERENCE: [Band Score 0-9] - [Explanation based on speech quality]
LEXICAL RESOURCE: [Band Score 0-9] - [Explanation based on vocabulary used]
GRAMMATICAL RANGE & ACCURACY: [Band Score 0-9] - [Explanation based on grammar accuracy]
PRONUNCIATION: [Band Score 0-9] - [Explanation based on pronunciation clarity]
OVERALL BAND SCORE: [Calculate average and apply IELTS rounding]
COMPREHENSIVE FEEDBACK: [Analysis focusing on strengths and specific improvements]`;
    } else {
      // Standard comprehensive analysis - focus on quality over quantity
      const avgPronunciation = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.pronunciation_score || 0), 0) / allTranscriptions.length;
      const avgFluency = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.fluency_score || 0), 0) / allTranscriptions.length;
      const avgGrammar = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.grammar_score || 0), 0) / allTranscriptions.length;
      const avgVocabulary = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.vocabulary_score || 0), 0) / allTranscriptions.length;

      comprehensivePrompt = `You are a senior, highly experienced IELTS examiner. Provide a holistic and accurate assessment based on the student's COMPLETE performance across ALL parts of the IELTS Speaking test.

RESPONSE QUALITY METRICS:
- Average words per response: ${Math.round(avgWordsPerResponse)}
- Coverage ratio: ${Math.round(coverageRatio * 100)}% substantive responses
- Average pronunciation score: ${avgPronunciation.toFixed(1)}/9.0 (from audio analysis)
- Average fluency score: ${avgFluency.toFixed(1)}/9.0 (speech rhythm and hesitation)
- Average grammar score: ${avgGrammar.toFixed(1)}/9.0 (sentence structure)
- Average vocabulary score: ${avgVocabulary.toFixed(1)}/9.0 (word choice and range)
- Total responses: ${allTranscriptions.length}

FULL TEST TRANSCRIPT (Gemini 2.5 transcription and analysis):
${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
Scores: P${t.metrics?.pronunciation_score || 0}/F${t.metrics?.fluency_score || 0}/G${t.metrics?.grammar_score || 0}/V${t.metrics?.vocabulary_score || 0}
Stress Issues: ${t.stress_patterns?.join(', ') || 'None noted'}
Intonation: ${t.intonation_recommendations?.join(', ') || 'Generally appropriate'}
Phonetics: ${t.phonetic_focus?.join(', ') || 'Clear pronunciation'}
Word Stress: ${t.word_stress_issues?.map(issue => `${issue.word}: ${issue.correct}`).join(', ') || 'Appropriate'}
`).join('\n')}

SCORING PRINCIPLES:
- Quality of speech matters more than quantity
- A short, well-articulated response can score higher than a long, error-filled response
- Focus on pronunciation clarity, intonation patterns, and speech rhythm (from audio analysis)
- Grammar accuracy, vocabulary range, and fluency
- Consider patterns across all parts of the test
- Use individual scores as guidance for overall assessment

Please return your assessment in this format:

FLUENCY & COHERENCE: [Band Score 0-9] - [Detailed justification with examples]
LEXICAL RESOURCE: [Band Score 0-9] - [Detailed justification with examples]
GRAMMATICAL RANGE & ACCURACY: [Band Score 0-9] - [Detailed justification with examples]
PRONUNCIATION: [Band Score 0-9] - [Detailed justification with examples]
OVERALL BAND SCORE: [Final calculated score following rounding rules]
COMPREHENSIVE FEEDBACK: [Holistic analysis with specific improvement recommendations]`;
    }

    // Use Gemini 2.5 for comprehensive analysis (can analyze all audio files!)
    const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `You are a senior IELTS Speaking examiner. Analyze the COMPLETE speaking test performance.

${comprehensivePrompt}

Return detailed analysis in this format:

FLUENCY & COHERENCE: [Band Score 0-9] - [Detailed justification with examples]
LEXICAL RESOURCE: [Band Score 0-9] - [Detailed justification with examples]
GRAMMATICAL RANGE & ACCURACY: [Band Score 0-9] - [Detailed justification with examples]
PRONUNCIATION: [Band Score 0-9] - [Detailed justification with examples, including stress patterns and phonetic issues]
OVERALL BAND SCORE: [Final calculated score]
COMPREHENSIVE FEEDBACK: [Holistic analysis with specific improvement recommendations]

ENHANCED ANALYSIS SUMMARY:
STRESS PATTERNS TO IMPROVE: [3-5 key words with correct stress patterns]
INTONATION RECOMMENDATIONS: [2-3 specific intonation improvements]
PHONETIC FOCUS AREAS: [3-5 specific sounds to practice]
WORD STRESS ISSUES: [List of commonly misstressed words with corrections]`
            },
            // Send all audio files for comprehensive audio analysis
            ...allRecordings.map(recording => ({
              inlineData: {
                data: recording.audio_base64,
                mimeType: 'audio/webm'
              }
            }))
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
          topP: 0.9,
          topK: 40
        }
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${await analysisResponse.text()}`);
    }

    const analysisResult = await analysisResponse.json();
    const analysis = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis unavailable';

    console.log('🎯 Final response data:', {
      transcriptionsCount: allTranscriptions.length,
      individualAnalysesCount: individualAnalyses.length,
      hasOverallAnalysis: !!analysis,
      qualityMetrics: { avgWordsPerResponse, coverageRatio, minimalCount: minimalResponses.length },
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enhanced speech analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});