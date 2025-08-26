import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle DeepSeek-specific suggestion generation
async function handleDeepSeekSuggestion(req: Request, deepseekApiKey: string) {
  const { questionText, userTranscription, part, questionIndex, audioFeatures } = await req.json();
  
  console.log('🤖 Generating DeepSeek suggestion for:', { part, questionIndex });
  
  if (!userTranscription?.trim()) {
    throw new Error('No transcription provided for suggestion generation');
  }

  // Enhanced prompt for DeepSeek to create better suggestions
  const prompt = `You are an expert IELTS examiner providing enhanced responses for speaking practice.

QUESTION: "${questionText}"

STUDENT'S ORIGINAL RESPONSE: "${userTranscription}"

${audioFeatures ? `
AUDIO ANALYSIS:
- Speech clarity: ${Math.round(audioFeatures.confidence * 100)}%
- Speaking rate: ${Math.round(audioFeatures.audioInsights?.speakingRate || 0)} wpm
- Pauses detected: ${audioFeatures.audioInsights?.pauseCount || 0}
` : ''}

Your task is to create an ENHANCED version that:
1. Maintains the core ideas from the original
2. Uses more sophisticated vocabulary and expressions
3. Improves grammatical structures and complexity
4. Enhances coherence and fluency
5. Adds relevant details and examples where appropriate
6. Demonstrates higher-level IELTS speaking skills

Return STRICT JSON format:
{
  "original_spans": [
    {"text": "word or phrase from original", "status": "error"|"neutral"},
    ...
  ],
  "suggested_spans": [
    {"text": "improved word or phrase", "status": "improvement"|"neutral"},
    ...
  ],
  "improvement_notes": "Brief explanation of key improvements made"
}

Rules:
- Mark problematic areas in original_spans as "error", good parts as "neutral"
- All suggested_spans improvements should be marked as "improvement" or "neutral"
- Ensure the enhanced response is 20-40% longer than the original
- Focus on IELTS band 7-8 level language and structures`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
            content: 'You are an expert IELTS examiner. Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API error:', errorText);
      throw new Error(`DeepSeek API error: ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from DeepSeek API');
    }

    // Parse the JSON response
    let parsedResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsedResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse DeepSeek response:', content);
      throw new Error('Invalid JSON response from DeepSeek');
    }

    // Validate the response structure
    if (!parsedResult.original_spans || !parsedResult.suggested_spans) {
      throw new Error('Invalid response structure from DeepSeek');
    }

    console.log('✅ DeepSeek suggestion generated successfully:', {
      originalSpansCount: parsedResult.original_spans.length,
      suggestedSpansCount: parsedResult.suggested_spans.length,
      hasNotes: !!parsedResult.improvement_notes
    });

    return new Response(JSON.stringify({
      success: true,
      original_spans: parsedResult.original_spans,
      suggested_spans: parsedResult.suggested_spans,
      improvement_notes: parsedResult.improvement_notes || 'Response enhanced with improved vocabulary and structure'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ DeepSeek suggestion generation failed:', error);
    
    // Return fallback suggestion if DeepSeek fails
    const words = userTranscription.split(/\s+/).filter(word => word.length > 0);
    const originalSpans = words.map((word, index) => ({
      text: index < words.length - 1 ? word + ' ' : word,
      status: 'neutral'
    }));
    
    const suggestedSpans = [
      ...originalSpans,
      { text: '. Additionally, I would like to elaborate that ', status: 'improvement' },
      { text: 'this topic presents interesting perspectives ', status: 'improvement' },
      { text: 'worth further consideration.', status: 'improvement' }
    ];

    return new Response(JSON.stringify({
      success: true,
      original_spans: originalSpans,
      suggested_spans: suggestedSpans,
      improvement_notes: 'Fallback enhancement applied due to processing error',
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function transcribeWithAdvancedAssemblyAI(audioBase64: string): Promise<{
  transcription: string;
  audioFeatures: {
    confidence: number;
    words: Array<{
      text: string;
      confidence: number;
      start: number;
      end: number;
    }>;
    audioInsights: {
      speakingRate: number;
      pauseCount: number;
      totalPauseDuration: number;
      averageConfidence: number;
    };
  };
}> {
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

  // Start advanced transcription with audio insights
  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'authorization': assemblyApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      language_code: 'en',
      // Enable advanced audio analysis features
      speech_model: 'best', // Use the best model for accuracy
      word_boost: ['IELTS', 'speaking', 'pronunciation'], // Boost relevant words
      punctuate: true,
      format_text: true,
      disfluencies: true, // Detect filler words, stutters
      multichannel: false,
      dual_channel: false
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

  const text = transcriptData.text || '';
  const words = transcriptData.words || [];
  
  // Calculate audio insights for pronunciation assessment
  let totalPauseDuration = 0;
  let pauseCount = 0;
  let totalConfidence = 0;
  
  // Analyze pauses between words for fluency assessment
  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currentWord = words[i];
    const pauseDuration = currentWord.start - prevWord.end;
    
    // Count significant pauses (>150ms)
    if (pauseDuration > 0.15) {
      pauseCount++;
      totalPauseDuration += pauseDuration;
    }
    
    totalConfidence += currentWord.confidence;
  }
  
  const averageConfidence = words.length > 0 ? totalConfidence / words.length : 0;
  const totalDuration = words.length > 0 ? words[words.length - 1].end - words[0].start : 0;
  const speakingRate = totalDuration > 0 ? words.length / totalDuration * 60 : 0; // words per minute
  
  return {
    transcription: text,
    audioFeatures: {
      confidence: transcriptData.confidence || 0,
      words,
      audioInsights: {
        speakingRate,
        pauseCount,
        totalPauseDuration,
        averageConfidence
      }
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced speech analysis started');
    
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const requestBody = await req.json();
    const { allRecordings, testData, analysisType = "comprehensive", action } = requestBody;
    
    // Handle DeepSeek suggestion generation specifically
    if (action === 'generate_suggestion') {
      return await handleDeepSeekSuggestion(
        new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(requestBody)
        }), 
        deepseekApiKey
      );
    }
    
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

      // Transcribe with advanced AssemblyAI analysis
      const { transcription, audioFeatures } = await transcribeWithAdvancedAssemblyAI(recording.audio_base64);

      console.log(`✅ Advanced transcription complete for ${recording.part}:`, {
        text: transcription.substring(0, 100) + '...',
        confidence: audioFeatures.confidence,
        speakingRate: audioFeatures.audioInsights.speakingRate,
        pauseCount: audioFeatures.audioInsights.pauseCount
      });

      // Enhanced minimal/quality checks with audio features
      const normalize = (t: string) => t
        .toLowerCase()
        .replace(/\b(uh|um|er|mm|like|you know|ah|uh-huh|hmm)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const cleaned = normalize(transcription || '');
      const wordCount = cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0;

      // More sophisticated assessment using audio features
      const isMinimalResponse = !transcription || 
                                wordCount < 8 ||
                                audioFeatures.confidence < 0.3 || // Very low transcription confidence
                                /^(silence|\.{3,}|bye\.?|mm|uh|um|er)$/i.test(transcription.trim()) ||
                                transcription.toLowerCase().includes('silence') ||
                                transcription.toLowerCase().includes('inaudible');

      let feedback = '';
      let original_spans: any[] = [];
      let suggested_spans: any[] = [];

      if (isMinimalResponse) {
        feedback = `This response shows no substantive content. Audio analysis indicates ${audioFeatures.confidence < 0.3 ? 'very unclear speech (confidence: ' + Math.round(audioFeatures.confidence * 100) + '%)' : 'minimal content'}. For IELTS Speaking, candidates must provide extended responses that address the question. A complete absence of meaningful speech results in the lowest possible scores across all criteria. To improve, practice speaking for the full allocated time with relevant content, clear pronunciation, and appropriate vocabulary.`;
      } else {
        // Enhanced analysis incorporating audio features
        const prompt = {
          role: 'user' as const,
          content: `You are a senior IELTS examiner with access to both transcription AND audio analysis data. 

QUESTION: "${recording.questionTranscription || recording.prompt}"

STUDENT TRANSCRIPTION: "${transcription}"

AUDIO ANALYSIS DATA:
- Overall transcription confidence: ${Math.round(audioFeatures.confidence * 100)}%
- Speaking rate: ${Math.round(audioFeatures.audioInsights.speakingRate)} words/minute (normal: 120-180 wpm)
- Number of significant pauses: ${audioFeatures.audioInsights.pauseCount}
- Total pause duration: ${Math.round(audioFeatures.audioInsights.totalPauseDuration * 1000)}ms
- Average word confidence: ${Math.round(audioFeatures.audioInsights.averageConfidence * 100)}%

ASSESSMENT FOCUS:
- PRONUNCIATION: Use transcription confidence scores to assess clarity
- FLUENCY: Use speaking rate and pause analysis
- INTONATION: Infer from confidence variations across words
- DELIVERY: Consider overall speech patterns

Return STRICT JSON:
{
  "pronunciation_score": number (1-9),
  "fluency_score": number (1-9), 
  "audio_feedback": string[3],
  "original_spans": {"text": string, "status": "error"|"neutral"}[],
  "suggested_spans": {"text": string, "status": "improvement"|"neutral"}[]
}

Rules:
- Use AUDIO DATA to assess pronunciation and fluency more accurately
- Consider confidence scores, speaking rate, and pause patterns
- audio_feedback: 3 points about pronunciation, fluency, and delivery based on audio analysis
- Incorporate both transcription and audio analysis in your assessment`,
        };

        const analysisResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${deepseekApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You are an expert IELTS examiner analyzing both transcription and audio features. Output STRICT JSON only.' },
              prompt
            ],
            max_tokens: 1000,
            temperature: 0.7
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

        if (parsed && Array.isArray(parsed.audio_feedback)) {
          feedback = parsed.audio_feedback.map((b: string) => `• ${b}`).join('\n');
          original_spans = Array.isArray(parsed.original_spans) ? parsed.original_spans : [];
          suggested_spans = Array.isArray(parsed.suggested_spans) ? parsed.suggested_spans : [];
        } else {
          // Fallback: create feedback from audio features AND generate basic spans
          const rateIssue = audioFeatures.audioInsights.speakingRate < 100 ? 'speaking too slowly' : 
                           audioFeatures.audioInsights.speakingRate > 200 ? 'speaking too quickly' : 'good speaking pace';
          const pauseIssue = audioFeatures.audioInsights.pauseCount > 5 ? 'too many hesitations' : 'good fluency';
          const clarityIssue = audioFeatures.confidence < 0.6 ? 'unclear pronunciation needs improvement' : 'generally clear speech';
          
          feedback = `• ${rateIssue}\n• ${pauseIssue}\n• ${clarityIssue}`;
          
          // Generate fallback spans for suggestion visualizer
          if (transcription && transcription.trim().length > 0) {
            const words = transcription.split(/\s+/).filter(word => word.length > 0);
            
            // Create original spans (mark some words as needing improvement)
            original_spans = words.map((word, index) => ({
              text: index < words.length - 1 ? word + ' ' : word,
              status: (word.includes('um') || word.includes('uh') || word.includes('er') || index % 7 === 0) ? 'error' : 'neutral'
            }));
            
            // Create improved version for suggestions
            const improvedResponse = transcription
              .replace(/\b(um|uh|er|mm|like)\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            const improvedWords = improvedResponse.split(/\s+/).filter(word => word.length > 0);
            suggested_spans = improvedWords.map((word, index) => ({
              text: index < improvedWords.length - 1 ? word + ' ' : word,
              status: 'improvement'
            }));
            
            // Add some enhanced vocabulary if the response is very basic
            if (improvedWords.length < 15) {
              suggested_spans.push(
                { text: '. Additionally, I believe that ', status: 'improvement' },
                { text: 'this topic requires further consideration ', status: 'improvement' },
                { text: 'due to its complexity and importance.', status: 'improvement' }
              );
            }
          }
        }
      }

        console.log(`✅ Individual analysis complete for ${recording.part}:`, {
          feedback: (feedback || '').substring(0, 100) + '...',
          hasOriginalSpans: original_spans.length > 0,
          hasSuggestedSpans: suggested_spans.length > 0,
          spanCounts: { original: original_spans.length, suggested: suggested_spans.length },
          parseSuccessful: parsed && Array.isArray(parsed.audio_feedback)
        });
        
        // Debug log the AI response if parsing failed
        if (!parsed || !Array.isArray(parsed.audio_feedback)) {
          console.log('⚠️ AI parsing failed. Raw response:', content.substring(0, 300) + '...');
        }
        
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
        audioFeatures, // Include audio features for detailed analysis
        metrics: { word_count: wordCount, minimal: isMinimalResponse }
      };
    }));

    console.log(`🎉 Individual analyses complete! Generated ${individualAnalyses.length} question analyses`);

    // Create overall transcriptions for comprehensive analysis with audio features
    const allTranscriptions = individualAnalyses.map(analysis => ({
      part: analysis.part,
      question: analysis.questionText,
      transcription: analysis.transcription,
      partNum: analysis.partNumber,
      questionIndex: analysis.questionIndex,
      metrics: analysis.metrics,
      audioFeatures: analysis.audioFeatures // Include audio data
    }));

    // Enhanced scoring with caps based on response quality AND audio features
    const minimalResponses = allTranscriptions.filter(t => t.metrics?.minimal);
    const totalWordCount = allTranscriptions.reduce((sum, t) => sum + (t.metrics?.word_count || 0), 0);
    const avgWordsPerResponse = totalWordCount / allTranscriptions.length;
    const coverageRatio = (allTranscriptions.length - minimalResponses.length) / allTranscriptions.length;
    
    // Calculate overall audio quality metrics
    const avgConfidence = allTranscriptions.reduce((sum, t) => sum + (t.audioFeatures?.confidence || 0), 0) / allTranscriptions.length;
    const avgSpeakingRate = allTranscriptions.reduce((sum, t) => sum + (t.audioFeatures?.audioInsights?.speakingRate || 0), 0) / allTranscriptions.length;
    const totalPauses = allTranscriptions.reduce((sum, t) => sum + (t.audioFeatures?.audioInsights?.pauseCount || 0), 0);

    // Standard comprehensive analysis with audio features
    const comprehensivePrompt = `You are a senior, highly experienced IELTS examiner conducting a COMPREHENSIVE FULL-TEST ANALYSIS with access to both transcription AND audio analysis data. Your goal is to provide a holistic and accurate assessment based on the student's COMPLETE performance across ALL parts of the IELTS Speaking test.

RESPONSE QUALITY METRICS:
- Average words per response: ${Math.round(avgWordsPerResponse)}
- Coverage ratio: ${Math.round(coverageRatio * 100)}% substantive responses
- Total responses: ${allTranscriptions.length}

AUDIO ANALYSIS METRICS (CRITICAL FOR PRONUNCIATION & FLUENCY):
- Average transcription confidence: ${Math.round(avgConfidence * 100)}% (indicates pronunciation clarity)
- Average speaking rate: ${Math.round(avgSpeakingRate)} words/minute (normal range: 120-180 wpm)
- Total significant pauses: ${totalPauses} across all responses (fluency indicator)

IMPORTANT: Base your assessment on the ENTIRE test performance using BOTH transcription content AND audio analysis data. The audio metrics provide crucial insights into pronunciation quality and fluency that text alone cannot capture.

FULL TEST TRANSCRIPT WITH DETAILED AUDIO ANALYSIS:
${allTranscriptions.map(t => `
${t.part} Question: ${t.question}
Student Response: ${t.transcription}
Audio Analysis: 
  - Confidence: ${Math.round((t.audioFeatures?.confidence || 0) * 100)}% (pronunciation clarity)
  - Speaking Rate: ${Math.round(t.audioFeatures?.audioInsights?.speakingRate || 0)} words/minute
  - Pauses: ${t.audioFeatures?.audioInsights?.pauseCount || 0} significant pauses
  - Average Word Confidence: ${Math.round((t.audioFeatures?.audioInsights?.averageConfidence || 0) * 100)}%
`).join('\n')}

COMPREHENSIVE ANALYSIS INSTRUCTIONS:
Use the audio confidence scores and speaking rate data to accurately assess:
- PRONUNCIATION: Higher confidence scores indicate clearer pronunciation
- FLUENCY: Speaking rate and pause patterns reveal natural flow
- INTONATION: Confidence variations suggest prosodic control
- OVERALL DELIVERY: Combine all audio metrics for holistic assessment

Please return your assessment in this format:

FLUENCY & COHERENCE: [Band Score 0-9] - [Detailed justification using speaking rate, pause analysis, and examples from multiple parts]
LEXICAL RESOURCE: [Band Score 0-9] - [Detailed justification with examples from multiple parts] 
GRAMMATICAL RANGE & ACCURACY: [Band Score 0-9] - [Detailed justification with examples from multiple parts]
PRONUNCIATION: [Band Score 0-9] - [Detailed justification using confidence scores, clarity assessment, and audio analysis data]
OVERALL BAND SCORE: [Final calculated score following rounding rules]
COMPREHENSIVE FEEDBACK: [Holistic analysis incorporating both transcription content and audio insights, showing patterns across all parts with specific audio-based recommendations]`;

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
            content: 'You are a senior IELTS Speaking examiner with comprehensive knowledge of official band descriptors. You must analyze the COMPLETE speaking test performance holistically, providing examples from different parts to support your assessment. Follow the assessment criteria and scoring rules exactly.'
          },
          {
            role: 'user',
            content: comprehensivePrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
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
      qualityMetrics: { 
        avgWordsPerResponse, 
        coverageRatio, 
        minimalCount: minimalResponses.length,
        avgConfidence: Math.round(avgConfidence * 100),
        avgSpeakingRate: Math.round(avgSpeakingRate),
        totalPauses 
      },
      analysisType: "comprehensive_full_test_with_audio"
    });

    return new Response(
      JSON.stringify({
        transcriptions: allTranscriptions,
        individualAnalyses,
        analysis,
        analysisType: "comprehensive_full_test_with_audio",
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Enhanced speech analysis failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        individualAnalyses: [],
        analysis: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});