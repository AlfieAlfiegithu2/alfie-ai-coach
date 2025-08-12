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

      // Enhanced minimal/quality checks
      const normalize = (t: string) => t
        .toLowerCase()
        .replace(/\b(uh|um|er|mm|like|you know|ah|uh-huh|hmm)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const cleaned = normalize(studentTranscription || '');
      const wordCount = cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0;

      const isMinimalResponse = !studentTranscription || 
                                wordCount < 8 ||
                                /^(silence|\.{3,}|bye\.?|mm|uh|um|er)$/i.test(studentTranscription.trim()) ||
                                studentTranscription.toLowerCase().includes('silence') ||
                                studentTranscription.toLowerCase().includes('inaudible');

      let feedback = '';
      let original_spans: any[] = [];
      let suggested_spans: any[] = [];

      if (isMinimalResponse) {
        feedback = `This response shows no substantive content. For IELTS Speaking, candidates must provide extended responses that address the question. A complete absence of meaningful speech results in the lowest possible scores across all criteria. To improve, practice speaking for the full allocated time with relevant content, clear pronunciation, and appropriate vocabulary.`;
      } else {
        // Ask for BOTH feedback bullets and suggestion spans in one call
        const prompt = {
          role: 'user' as const,
          content: `You are a senior IELTS examiner. Analyze the student's answer to the question: "${recording.questionTranscription || recording.prompt}"\n\nStudent transcription (may include 'inaudible' where sound is unclear):\n${studentTranscription}\n\nReturn STRICT JSON with this shape only:{\n  "feedback_bullets": string[2..3],\n  "original_spans": {"text": string, "status": "error"|"neutral"}[],\n  "suggested_spans": {"text": string, "status": "improvement"|"neutral"}[]\n}\nRules:\n- feedback_bullets: 2-3 short, actionable points about fluency/pronunciation/intonation (audio-focused).\n- original_spans: segment the student's text; mark weak or incorrect segments as status "error"; others "neutral".\n- suggested_spans: rewrite as a higher-band answer; mark improved parts as status "improvement"; others "neutral".\n- Do NOT include explanations outside JSON.`,
        };

        const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'You are a precise IELTS examiner. Output STRICT JSON only, no prose.' },
              prompt
            ],
            temperature: 0.2,
          }),
        });

        if (!analysisResponse.ok) {
          const errorText = await analysisResponse.text();
          console.error(`❌ Individual analysis failed for ${recording.part}:`, errorText);
          throw new Error(`Individual analysis failed: ${errorText}`);
        }

        const analysisJson = await analysisResponse.json();
        const content = analysisJson.choices?.[0]?.message?.content || '';
        const parsed = extractJson(content);

        if (parsed && Array.isArray(parsed.feedback_bullets)) {
          feedback = parsed.feedback_bullets.map((b: string) => `• ${b}`).join('\n');
          original_spans = Array.isArray(parsed.original_spans) ? parsed.original_spans : [];
          suggested_spans = Array.isArray(parsed.suggested_spans) ? parsed.suggested_spans : [];
        } else {
          // Fallback: use raw content as feedback
          feedback = content || 'Analysis unavailable.';
        }
      }

      console.log(`✅ Individual analysis complete for ${recording.part}:`, (feedback || '').substring(0, 100) + '...');
        
      return {
        part: recording.part,
        partNumber: recording.partNum,
        questionIndex: recording.questionIndex,
        questionText: recording.questionTranscription || recording.prompt,
        transcription: studentTranscription,
        feedback,
        audio_url: recording.audio_url,
        original_spans,
        suggested_spans,
        metrics: { word_count: wordCount, minimal: isMinimalResponse }
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
      metrics: analysis.metrics
    }));

    // Enhanced scoring with caps based on response quality
    const minimalResponses = allTranscriptions.filter(t => t.metrics?.minimal);
    const totalWordCount = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.word_count || 0), 0);
    const avgWordsPerResponse = totalWordCount / allTranscriptions.length;
    const coverageRatio = (allTranscriptions.length - minimalResponses.length) / allTranscriptions.length;

    let comprehensivePrompt;
    
    // Apply stricter caps based on response quality metrics
    if (minimalResponses.length > allTranscriptions.length / 2) {
      // More than half responses are minimal - very low scores
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
    } else if (avgWordsPerResponse < 15 || coverageRatio < 0.7) {
      // Low word count or many minimal responses - cap at 3.0-4.5
      comprehensivePrompt = `You are a senior IELTS examiner. The student provided very short responses with limited content throughout the test.

RESPONSE QUALITY METRICS:
- Average words per response: ${Math.round(avgWordsPerResponse)}
- Coverage ratio: ${Math.round(coverageRatio * 100)}% of questions had substantive answers
- Total word count: ${totalWordCount}

FULL TEST TRANSCRIPT:
${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
`).join('\n')}

CRITICAL SCORING CONSTRAINT: Due to very short responses and limited content, all criterion scores must be capped at 4.5 maximum. Short responses cannot demonstrate higher-level speaking abilities regardless of accuracy.

Please return your assessment with scores between 3.0-4.5:

FLUENCY & COHERENCE: [3.0-4.5] - [Explanation considering limited content]
LEXICAL RESOURCE: [3.0-4.5] - [Explanation considering limited vocabulary range]
GRAMMATICAL RANGE & ACCURACY: [3.0-4.5] - [Explanation considering limited complexity]
PRONUNCIATION: [3.0-4.5] - [Explanation based on available speech]
OVERALL BAND SCORE: [Calculate average and apply IELTS rounding]
COMPREHENSIVE FEEDBACK: [Analysis acknowledging the limitations of short responses]`;
    } else {
      // Standard comprehensive analysis with some quality considerations
      comprehensivePrompt = `You are a senior, highly experienced IELTS examiner conducting a COMPREHENSIVE FULL-TEST ANALYSIS. Your goal is to provide a holistic and accurate assessment based on the student's COMPLETE performance across ALL parts of the IELTS Speaking test.

RESPONSE QUALITY METRICS:
- Average words per response: ${Math.round(avgWordsPerResponse)}
- Coverage ratio: ${Math.round(coverageRatio * 100)}% substantive responses
- Total responses: ${allTranscriptions.length}

IMPORTANT: Base your assessment on the ENTIRE test performance, not just individual questions. Look for patterns, development, and overall communicative effectiveness across all parts.

FULL TEST TRANSCRIPT:

${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
`).join('\n')}

COMPREHENSIVE ANALYSIS INSTRUCTIONS:

Evaluate the student's OVERALL performance across the complete test using these criteria with appropriate caps based on response length and coverage:

Fluency and Coherence (0-9):
- How well did they maintain speech flow throughout ALL parts?
- Did they show improvement or decline across parts?
- Overall coherence and logical development across different question types
- Cap at 5.5 if responses are consistently very short (under 20 words average)

Lexical Resource (0-9):
- Range of vocabulary demonstrated across ALL topics and parts
- Flexibility in vocabulary use between different speaking tasks
- Appropriateness of language for different contexts (interview, long turn, discussion)
- Cap at 5.5 if limited vocabulary range due to short responses

Grammatical Range and Accuracy (0-9):
- Variety of structures used throughout the complete test
- Accuracy patterns across all responses
- Ability to handle different grammatical demands of each part
- Cap at 5.5 if limited structural complexity due to brevity

Pronunciation (0-9):
- Consistency of pronunciation throughout the entire test
- Intelligibility across all parts and question types
- Impact on communication across the full performance

CRITICAL REQUIREMENTS:
1. Provide specific examples from DIFFERENT parts of the test in your feedback
2. Show how performance varied or remained consistent across parts
3. Give a truly holistic assessment, not just based on one question
4. Reference patterns observed across the complete test
5. Apply appropriate caps based on response length and substance

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
            content: 'You are a senior IELTS Speaking examiner with comprehensive knowledge of official band descriptors. You must analyze the COMPLETE speaking test performance holistically, providing examples from different parts to support your assessment. Follow the assessment criteria and scoring rules exactly, including any caps specified based on response quality.'
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