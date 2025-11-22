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

<<<<<<< HEAD
    const { allRecordings, testData, analysisType = "comprehensive" } = await req.json();
=======
    const { allRecordings, testData, targetLanguage = "English", analysisType = "comprehensive" } = await req.json();
>>>>>>> 5a7bbb9 (fix: update supabase functions)

    console.log('📊 Received data:', {
      recordingsCount: allRecordings?.length || 0,
      hasTestData: !!testData,
      targetLanguage,
      analysisType
    });

    if (!allRecordings || allRecordings.length === 0) {
      throw new Error('No recording data provided');
    }

<<<<<<< HEAD
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

    // First, transcribe each recording individually using Gemini with actual audio.
    // HARD CONSTRAINTS:
    // - Use ONLY the provided audio (base64 or fetched from audio_url).
    // - If audio is missing/unreadable, mark as "No audio recorded" / "Inaudible" and DO NOT invent content.
    // - Downstream results must always reflect actual audio reality.
    console.log('🎤 Starting individual audio transcriptions...');
    const transcriptionsWithAnalysis = await Promise.all(
      normalized.map(async (rec) => {
        let transcription = '';

        // Get audio as base64 if available
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
              const contentType =
                audioResponse.headers.get('content-type') || 'audio/webm';
              mimeType = contentType;
            }
          } catch (err) {
            console.error(`❌ Failed to fetch audio for ${rec.part}:`, err);
          }
        }

        // If no usable audio, mark clearly and never fabricate
        if (!audioData) {
          transcription = 'No audio recorded';
          return {
            ...rec,
            transcription,
            audioData: 'missing',
          };
        }

        try {
          console.log(
            `🎯 Transcribing audio for ${rec.part} using Gemini via OpenRouter (audio-only, no hallucinations)...`
          );
          const geminiResponse = await fetch(
            `https://openrouter.ai/api/v1/chat/completions`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${openrouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://englishaidol.com',
                'X-Title':
                  'English Aidol IELTS Speaking Transcription (audio-grounded)',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-preview-09-2025',
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text:
                          'Transcribe this IELTS Speaking test audio EXACTLY as spoken. ' +
                          'Only use information from the audio. ' +
                          'Include fillers like "um", "uh". ' +
                          'If unclear, use "[inaudible]". ' +
                          'Return ONLY the raw transcription text, no explanations, no extra sentences.',
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          // OpenRouter treats this generically as binary; naming stays for compatibility.
                          url: `data:${mimeType};base64,${audioData}`,
                        },
                      },
                    ],
                  },
                ],
                temperature: 0.0,
                max_tokens: 800,
              }),
            }
          );

          if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error(
              `❌ Transcription request failed for ${rec.part}:`,
              errorText
            );
            transcription =
              'Inaudible - audio could not be transcribed';
          } else {
            const geminiResult = await geminiResponse.json();
            transcription =
              geminiResult.choices?.[0]?.message?.content?.trim() || '';
            // Normalize / sanitize
            transcription = transcription
              .replace(/```/g, '')
              .replace(/^transcription[:\-]\s*/i, '')
              .trim();
            if (
              !transcription ||
              /cannot transcribe|no audio|unable to/i.test(transcription)
            ) {
              transcription =
                'Inaudible - audio could not be transcribed';
            }
          }
        } catch (err) {
          console.error(
            `❌ Transcription error for ${rec.part}:`,
            err
          );
          transcription =
            'Inaudible - audio transcription failed';
        }

        return {
          ...rec,
          transcription,
          audioData: 'present',
        };
      })
    );
    
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
=======
    // Prepare messages for the multimodal request
    const contentParts = [];

    // Add system instruction as the first text part
    contentParts.push({
      type: "text",
      text: `You are a senior IELTS Speaking examiner. Analyze the student's speaking test performance based on the provided audio recordings and question context.

      TARGET LANGUAGE: ${targetLanguage}
      
      CRITICAL INSTRUCTION: 
      - Provide ALL feedback, explanations, advice, and actionable steps in ${targetLanguage}.
      - Keep the "transcription" and "better" (improved version) in English (as it's an English test).
      - For "vocabulary_enhancements" and "grammar_corrections", the explanations should be in ${targetLanguage}.
      
      For EACH recording, you must provide:
      1. A verbatim transcription of what the student said.
      2. Detailed feedback on their performance for that specific part (in ${targetLanguage}).
      3. Specific improvements (better vocabulary, grammar corrections).

For EACH recording, you must provide:
1. A verbatim transcription of what the student said.
2. Detailed feedback on their performance for that specific part.
3. Specific improvements (better vocabulary, grammar corrections).

Then provide an OVERALL analysis of the entire test.

Return the analysis in this STRICT JSON format:
{
  "individualAnalyses": [
    {
      "part": "Part 1",
      "questionIndex": 0,
      "transcription": "Verbatim transcription of the student's answer...",
      "feedback": "Specific feedback for this answer...",
      "original_spans": [{"text": "bad phrase", "type": "error"}],
      "suggested_spans": [{"text": "better phrase", "type": "correction"}]
    }
  ],
  "overallAnalysis": {
    "fluency_coherence": { "score": 6.5, "feedback": "..." },
    "lexical_resource": { "score": 6.0, "feedback": "..." },
    "grammatical_range": { "score": 7.0, "feedback": "..." },
    "pronunciation": { "score": 6.5, "feedback": "..." },
    "overall_band_score": 6.5,
    "comprehensive_feedback": "..."
  }
}
`
    });

    // Add context about the questions
    const questionContext = allRecordings.map((r: any, i: number) =>
      `Recording ${i + 1} (${r.part}): Question: "${r.questionTranscription || r.questionText || 'Unknown'}"`
    ).join('\n');

    contentParts.push({
      type: "text",
      text: `Here are the questions the student is answering:\n${questionContext}\n\nNow, analyze the following audio files:`
    });

    // Add audio parts
    // Note: OpenRouter/Gemini expects audio as a URL in the content array
    for (const recording of allRecordings) {
      if (recording.audio_url) {
        contentParts.push({
          type: "text",
          text: `[Audio for ${recording.part}]`
        });
        contentParts.push({
          type: "image_url", // OpenRouter/Gemini often uses image_url struct for multimodal inputs, or specific audio struct depending on provider. 
          // Checking standard OpenRouter Gemini docs, they support standard OpenAI content parts.
          // For audio, it's often passed as a URL in a specific way or just treated as a multimodal input.
          // Let's try the standard OpenAI 'image_url' format which is often overloaded, OR check if we need 'audio_url'.
          // Actually, for Gemini via OpenRouter, it's best to use the 'http' url if supported, or base64.
          // Since we have public R2 URLs, we'll try to pass them.
          // However, standard OpenAI API doesn't strictly support audio URLs in chat completions yet universally.
          // Gemini 1.5 Pro/Flash DOES support audio.
          // Let's try the standard message format for Gemini.
          url: recording.audio_url
        } as any);
      }
    }

    // REVISION: OpenRouter/Gemini specific format for audio usually involves:
    // { type: "text", text: "..." }, { type: "image_url", url: "..." } is for images.
    // For audio, it might be { type: "audio_url", audio_url: { url: "..." } } or similar.
    // Let's try the most robust way: passing the audio URL in the text if the model supports fetching, 
    // OR using the specific 'input' format if we were using Vertex AI directly.
    // BUT, since we are using OpenRouter, we should check their docs or assume standard multimodal.
    // A common pattern for OpenRouter Gemini is to just pass the URL in the content list if it's a supported file type.
    // Let's try to construct the body specifically for Gemini 2.5 Flash.

    // Actually, to be safe and ensure it works, let's use the 'text' to explicitly point to the URL 
    // and hope the model can access it (Gemini often can access public URLs).
    // IF NOT, we might need to fetch and base64 encode it.
    // Given the previous code had `audio_base64`, let's see if we can use that.
    // The previous code prepared `audio_base64` in the frontend/backend boundary but didn't use it.
    // Let's use the `audio_base64` if available, as that's safer for the model to "hear".

    const messages = [
>>>>>>> 5a7bbb9 (fix: update supabase functions)
      {
        role: "system",
        content: `You are a senior IELTS Speaking examiner. Analyze the student's speaking test performance based on the provided audio recordings and question context.
        
        CRITICAL: You must return valid JSON only. No markdown formatting.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze these IELTS speaking responses.
            
            CONTEXT:
            ${questionContext}
            
            OUTPUT FORMAT (JSON ONLY):
            {
              "individualAnalyses": [
                {
                  "part": "Part 1",
                  "questionIndex": 0,
                  "transcription": "Verbatim transcription...",
                  "feedback": "Specific feedback...",
                  "original_spans": [],
                  "suggested_spans": []
                }
              ],
  "overallAnalysis": {
    "fluency_coherence": { "score": 6.5, "feedback": "..." },
    "lexical_resource": { "score": 6.0, "feedback": "..." },
    "grammatical_range": { "score": 7.0, "feedback": "..." },
    "pronunciation": { "score": 6.5, "feedback": "..." },
    "overall_band_score": 6.5,
    "examiner_comments": "...",
    "actionable_next_steps": [
      "Practice using...",
      "Focus on..."
    ]
  }
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Here is the test context:\n${questionContext}\n\nPlease analyze the following audio files:`
              },
              ...allRecordings.map((r: any) => {
                if (r.audio_base64) {
                  return {
                    type: "image_url",
                    image_url: {
                      url: `data:audio/webm;base64,${r.audio_base64}`
                    }
                  };
                } else if (r.audio_url) {
                  return {
                    type: "image_url",
                    image_url: {
                      url: r.audio_url
                    }
                  };
                }
                return null;
              }).filter(Boolean)
            ]
          }
        ];

        console.log('📝 Sending request to OpenRouter...');

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
            messages: messages,
            temperature: 0.2, // Lower temperature for more consistent JSON
            response_format: { type: "json_object" }
          }),
        });

        if(!analysisResponse.ok) {
  const errorText = await analysisResponse.text();
  throw new Error(`Analysis failed: ${errorText}`);
}

const analysisResult = await analysisResponse.json();
const rawContent = analysisResult.choices?.[0]?.message?.content;

if (!rawContent) {
  throw new Error('No content received from AI');
}

let parsedResult;
try {
  parsedResult = JSON.parse(rawContent);
} catch (e) {
  console.error('Failed to parse JSON:', rawContent);
  throw new Error('Invalid JSON response from AI');
}

// Merge with original metadata
const individualAnalyses = allRecordings.map((recording: any, index: number) => {
  const aiAnalysis = parsedResult.individualAnalyses?.[index] || {};
  return {
    ...recording,
    ...aiAnalysis, // Merge AI fields (transcription, improved_version, etc.)
    // Ensure fallbacks
    transcription: aiAnalysis.transcription || "Transcription unavailable",
    improved_version: aiAnalysis.improved_version || "Improvement unavailable",
    feedback: aiAnalysis.feedback || "No feedback available",
    vocabulary_enhancements: aiAnalysis.vocabulary_enhancements || [],
    grammar_corrections: aiAnalysis.grammar_corrections || []
  };
});

console.log('✅ Analysis complete. Returning rich results.');

return new Response(
  JSON.stringify({
    success: true,
    data: {
      overallAnalysis: parsedResult.overallAnalysis,
      individualAnalyses: individualAnalyses
    }
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
