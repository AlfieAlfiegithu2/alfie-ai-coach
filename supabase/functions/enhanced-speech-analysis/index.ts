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

    // Normalize recordings: trust upstream (IELTSSpeakingResults) to send:
    // - part (e.g. "part1_q0")
    // - partNumber / partNum
    // - questionIndex
    // - questionText / questionTranscription / prompt
    // - audio_base64 (preferred) or audio_url (fallback)
    const normalized = allRecordings.map((r: any, index: number) => {
      const part = String(r.part || `part${r.partNumber || r.partNum || 1}_q${r.questionIndex || 0}`);
      const partNum =
        typeof r.partNumber === 'number'
          ? r.partNumber
          : typeof r.partNum === 'number'
          ? r.partNum
          : parseInt(part.replace(/[^0-9]/g, ''), 10) || 1;
      const questionIndex = typeof r.questionIndex === 'number' ? r.questionIndex : 0;
      const questionText =
        r.questionText ||
        r.questionTranscription ||
        r.prompt ||
        `Part ${partNum} Question ${questionIndex + 1}`;

      return {
        index: index + 1,
        part,
        partNum,
        questionIndex,
        questionText,
        audio_base64: r.audio_base64 || null,
        audio_url: r.audio_url || null,
      };
    });

    console.log('📊 Normalized recordings:', normalized.map(r => ({
      index: r.index,
      part: r.part,
      partNum: r.partNum,
      questionIndex: r.questionIndex,
      hasAudioBase64: !!r.audio_base64,
      hasAudioUrl: !!r.audio_url,
    })));

    // Build an explicit, honest prompt: do NOT claim lack of access when we have metadata.
    const promptLines: string[] = [];
    promptLines.push(
      'You are a senior IELTS Speaking examiner. Analyze the performance based on the provided prompts and machine-processed audio summaries below.'
    );
    promptLines.push('');
    promptLines.push('Each recording is described with: part, question text, and whether valid audio was captured.');
    promptLines.push('');

    for (const rec of normalized) {
      promptLines.push(
        `Recording ${rec.index}: ${rec.part} | Part ${rec.partNum}, Q${rec.questionIndex + 1} | ` +
          `Question: "${rec.questionText}" | Has Audio: ${
            rec.audio_base64 || rec.audio_url ? 'Yes' : 'No'
          }`
      );
    }

    const comprehensivePrompt = promptLines.join('\n');

    console.log(
      '📝 Comprehensive prompt (first 400 chars):',
      comprehensivePrompt.substring(0, 400) + '...'
    );

    // First, transcribe each recording individually using Gemini with actual audio
    console.log('🎤 Starting individual audio transcriptions...');
    const transcriptionsWithAnalysis = await Promise.all(normalized.map(async (rec, idx) => {
      let transcription = '';
      let audioAnalysis = null;
      
      // Try to get audio data
      let audioData: string | null = null;
      let mimeType = 'audio/webm';
      
      if (rec.audio_base64) {
        audioData = rec.audio_base64;
      } else if (rec.audio_url && rec.audio_url.startsWith('https://')) {
        try {
          console.log(`📥 Fetching audio from URL for ${rec.part}: ${rec.audio_url}`);
          const audioResponse = await fetch(rec.audio_url);
          if (audioResponse.ok) {
            const audioBlob = await audioResponse.arrayBuffer();
            audioData = btoa(String.fromCharCode(...new Uint8Array(audioBlob)));
            // Determine mime type from URL or response headers
            const contentType = audioResponse.headers.get('content-type') || 'audio/webm';
            mimeType = contentType;
          }
        } catch (err) {
          console.error(`❌ Failed to fetch audio for ${rec.part}:`, err);
        }
      }
      
      // If we have audio, transcribe it with Gemini via OpenRouter
      if (audioData) {
        try {
          console.log(`🎯 Transcribing audio for ${rec.part} using Gemini via OpenRouter...`);
          const geminiResponse = await fetch(
            `https://openrouter.ai/api/v1/chat/completions`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${openrouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://englishaidol.com',
                'X-Title': 'English Aidol IELTS Speaking Transcription',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-preview-09-2025',
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: `Transcribe this IELTS Speaking test audio exactly as spoken. Include filler words like "um", "uh", "like". If any part is unclear, mark it as "[inaudible]". Return ONLY the transcription text, nothing else.`
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: `data:${mimeType};base64,${audioData}`
                        }
                      }
                    ]
                  }
                ],
                temperature: 0.1,
                max_tokens: 1000,
              }),
            }
          );
          
          if (geminiResponse.ok) {
            const geminiResult = await geminiResponse.json();
            transcription = geminiResult.choices?.[0]?.message?.content?.trim() || '';
            // Clean up transcription - remove any markdown or extra formatting
            transcription = transcription.replace(/```/g, '').replace(/transcription:/gi, '').trim();
            if (!transcription || transcription.toLowerCase().includes('cannot') || transcription.toLowerCase().includes('unable')) {
              transcription = 'Inaudible - audio could not be transcribed';
            }
            console.log(`✅ Transcription for ${rec.part}: ${transcription.substring(0, 100)}...`);
          } else {
            const errorText = await geminiResponse.text();
            console.error(`❌ Transcription failed for ${rec.part}:`, errorText);
            transcription = 'Inaudible - audio could not be transcribed';
          }
        } catch (err) {
          console.error(`❌ Transcription error for ${rec.part}:`, err);
          transcription = 'Inaudible - audio transcription failed';
        }
      } else {
        transcription = 'No audio recorded';
      }
      
      return {
        ...rec,
        transcription,
        audioData: audioData ? 'present' : 'missing'
      };
    }));
    
    console.log('✅ Completed transcriptions:', transcriptionsWithAnalysis.map(r => ({
      part: r.part,
      transcriptionLength: r.transcription?.length || 0,
      hasAudio: r.audioData === 'present'
    })));

    // Now call OpenRouter (Gemini) for analysis with actual transcriptions
    const analysisPrompt = `You are a senior IELTS Speaking examiner. Analyze the following student responses:

${transcriptionsWithAnalysis.map((rec, idx) => `
Recording ${idx + 1}: ${rec.part} | Part ${rec.partNum}, Question ${rec.questionIndex + 1}
Question: "${rec.questionText}"
Student's Response: "${rec.transcription}"
`).join('\n')}

Using this information, produce:
1) A JSON object under key "overall" with:
  - overallBandScore (number)
  - criteria: {
      fluency: { score: 0-9, feedback: "detailed feedback text explaining the score" },
      lexical: { score: 0-9, feedback: "detailed feedback text explaining the score" },
      grammar: { score: 0-9, feedback: "detailed feedback text explaining the score" },
      pronunciation: { score: 0-9, feedback: "detailed feedback text explaining the score" }
    }
  - path_to_higher_score: string[] (3-6 bullet-style tips)
2) An array "per_question" with one entry per recording (in the same order as above):
  - part
  - partNumber
  - questionIndex
  - questionText
  - transcription: Use the EXACT transcription provided above, do not generate or simulate
  - feedback: specific, actionable feedback for that response (1-3 sentences)
  - original_spans: array of {text: string, status: "error"|"neutral"|"good"} representing the student's actual response with error highlighting
  - suggested_spans: array of {text: string, status: "improvement"|"neutral"} representing an improved version of the response
  - metrics: { word_count, minimal (bool), pronunciation_score, fluency_score, grammar_score, vocabulary_score }
Return ONLY valid JSON, no markdown, no commentary.`;

    const analysisResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'English Aidol IELTS Speaking Analysis',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-preview-09-2025',
          messages: [
            {
              role: 'system',
              content: 'You are an IELTS Speaking examiner. Analyze the provided transcriptions and give detailed feedback.',
            },
            {
              role: 'user',
              content: analysisPrompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 4000,
          top_p: 0.9,
        }),
      }
    );

    if (!analysisResponse.ok) {
      const errText = await analysisResponse.text();
      throw new Error(`Analysis failed: ${errText}`);
    }

    const analysisResult = await analysisResponse.json();
    const content = analysisResult.choices?.[0]?.message?.content || '';

    // Helper to safely extract JSON from the model response
    const extractJson = (text: string): any | null => {
      try {
        const trimmed = text.trim();
        // If it's already plain JSON
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          return JSON.parse(trimmed);
        }
        // Remove fences or extra text
        const cleaned = trimmed
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        return JSON.parse(cleaned);
      } catch (_) {
        return null;
      }
    };

    const parsed = extractJson(content);
    if (!parsed) {
      console.warn(
        '⚠️ Could not parse structured JSON from model, returning raw content.'
      );
      return new Response(
        JSON.stringify({
          success: true,
          analysis: content,
          individualAnalyses: [],
          transcriptions: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const perQuestion = Array.isArray(parsed.per_question)
      ? parsed.per_question
      : [];

    const individualAnalyses = perQuestion.map((item: any, idx: number) => {
      const base = transcriptionsWithAnalysis[idx] || transcriptionsWithAnalysis[0] || normalized[idx] || normalized[0];
      // Use actual transcription from our transcription step, not AI-generated one
      const actualTranscription = base.transcription || 
        (item.transcription && !item.transcription.toLowerCase().includes('simulated') && !item.transcription.toLowerCase().includes('summary') 
          ? item.transcription 
          : null) ||
        (base.audio_base64 || base.audio_url ? 'Inaudible - audio could not be understood' : 'No audio recorded');
      
      return {
        part: item.part || base.part,
        partNumber:
          typeof item.partNumber === 'number'
            ? item.partNumber
            : base.partNum,
        questionIndex:
          typeof item.questionIndex === 'number' && !isNaN(item.questionIndex)
            ? item.questionIndex
            : base.questionIndex,
        questionText:
          item.questionText || base.questionText,
        transcription: actualTranscription,
        feedback:
          item.feedback ||
          'Keep developing your ideas with clearer structure and richer vocabulary.',
        audio_url: base.audio_url || null,
        original_spans: item.original_spans || [],
        suggested_spans: item.suggested_spans || [],
        metrics: {
          word_count: item.metrics?.word_count ?? 0,
          minimal: !!item.metrics?.minimal,
          pronunciation_score:
            item.metrics?.pronunciation_score ?? 0,
          intonation_score: item.metrics?.intonation_score ?? 0,
          fluency_score: item.metrics?.fluency_score ?? 0,
          grammar_score: item.metrics?.grammar_score ?? 0,
          vocabulary_score:
            item.metrics?.vocabulary_score ?? 0,
          overall_band: item.metrics?.overall_band ?? 0,
        },
      };
    });

    // Overall object fallback if missing
    const overall = parsed.overall || {};

    console.log('🎯 Final response data:', {
      recordingsCount: normalized.length,
      individualAnalysesCount: individualAnalyses.length,
      hasOverall: !!parsed.overall || !!parsed.analysis,
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: parsed.analysis || content,
        overallBandScore: overall.overallBandScore,
        criteria: overall.criteria,
        path_to_higher_score:
          overall.path_to_higher_score || parsed.path_to_higher_score,
        transcriptions: individualAnalyses.map((a) => ({
          part: a.part,
          question: a.questionText,
          transcription: a.transcription,
          partNum: a.partNumber,
          questionIndex: a.questionIndex,
          audio_url: a.audio_url,
        })),
        individualAnalyses,
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
