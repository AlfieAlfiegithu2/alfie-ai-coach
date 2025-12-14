import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry function with exponential backoff
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`📤 API request attempt ${attempt + 1}/${maxRetries}`);
            const response = await fetch(url, options);

            // If we get a 429 (rate limit) or 5xx error, retry
            if (response.status === 429 || response.status >= 500) {
                const errorText = await response.text();
                console.warn(`⚠️ Attempt ${attempt + 1} failed with status ${response.status}: ${errorText}`);
                lastError = new Error(`API returned ${response.status}: ${errorText}`);

                if (attempt < maxRetries - 1) {
                    const delayMs = baseDelayMs * Math.pow(2, attempt); // Exponential backoff
                    console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
            }

            return response;
        } catch (error) {
            console.error(`❌ Attempt ${attempt + 1} network error:`, error.message);
            lastError = error;

            if (attempt < maxRetries - 1) {
                const delayMs = baseDelayMs * Math.pow(2, attempt);
                console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { audio, prompt } = await req.json();

        if (!audio) {
            throw new Error('No audio data provided');
        }

        // Validate audio size
        const audioSizeKB = audio.length / 1024;
        const audioSizeMB = audioSizeKB / 1024;
        console.log(`📊 Audio data size: ${audioSizeKB.toFixed(0)} KB (${audioSizeMB.toFixed(2)} MB)`);

        // Warn if audio is very large (> 5MB base64 = ~3.75MB actual audio)
        if (audioSizeMB > 8) {
            console.warn('⚠️ Audio file is very large, evaluation may be slow or fail');
        }

        // Reject if audio is too large (> 15MB base64)
        if (audioSizeMB > 15) {
            throw new Error('Audio file is too large (>15MB). Please record a shorter response.');
        }

        const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterApiKey) {
            throw new Error('OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your Supabase Edge Function secrets.');
        }

        console.log('🎤 Analyzing audio with Gemini 2.5 Flash via OpenRouter...');
        console.log('📝 Prompt text:', prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''));

        // Expert IELTS examiner evaluation prompt
        const systemPrompt = `You are an expert IELTS Speaking Examiner analyzing a student's spoken response.

CRITICAL: You are receiving ACTUAL AUDIO, not just text. Analyze the speech based on official IELTS criteria.

EVALUATION CRITERIA (0-100 scale):

**PRONUNCIATION** - Sound clarity, individual sounds, accent comprehensibility
**VOCABULARY** - Range of words, appropriateness, collocations, idioms
**GRAMMAR** - Sentence structures, tense usage, accuracy
**INTONATION** - Pitch variation, word/sentence stress patterns
**FLUENCY** - Pace, hesitations, coherence, natural flow

SCORING GUIDE:
- 85-100: Excellent, near-native level
- 70-84: Good, clear with minor issues
- 55-69: Adequate, noticeable room for improvement
- 40-54: Limited, frequent issues
- 0-39: Very limited

Return ONLY a valid JSON object with this EXACT structure:
{
  "transcription": "What the student actually said (transcribe the audio)",
  "feedback": "Brief, encouraging feedback (2-3 sentences) focusing on what they did well and ONE key area to improve.",
  "enhancedSentence": "A Band 8-9 IELTS-level version of their answer - sophisticated but conversational.",
  "metrics": {
    "pronunciation": <0-100 integer>,
    "vocabulary": <0-100 integer>,
    "grammar": <0-100 integer>,
    "intonation": <0-100 integer>,
    "fluency": <0-100 integer>
  },
  "detailedAnalysis": {
    "pronunciation": "Specific sounds that were clear or unclear",
    "vocabulary": "Comment on word choices, range, and appropriateness",
    "grammar": "Note specific grammatical strengths and errors",
    "intonation": "Describe pitch patterns and stress",
    "fluency": "Comment on pace, pauses, and overall flow"
  },
  "word_highlights": [
    {
      "word": "the actual word from transcription",
      "type": "correct" | "pronunciation_error" | "grammar_error" | "vocabulary_issue",
      "note": "Brief note explaining the issue if type is not 'correct'"
    }
  ]
}

IMPORTANT for word_highlights:
- Include EVERY word from the transcription
- Mark words as "correct" (green) if used/pronounced well
- Mark as "pronunciation_error" (red) if mispronounced
- Mark as "grammar_error" (orange) if grammatically incorrect
- Mark as "vocabulary_issue" (yellow) if awkward word choice`;

        const userPrompt = `Question: "${prompt}"

Listen to the student's spoken response and provide detailed pronunciation analysis based on what you HEAR in the audio.`;

        // Use OpenRouter with multipart content for audio (OpenAI-compatible format)
        const requestBody = {
            model: 'google/gemini-2.5-flash-preview-05-20',
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:audio/webm;base64,${audio}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.7,
            max_tokens: 4096  // Increased for longer responses (Part 2)
        };

        const response = await fetchWithRetry(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openRouterApiKey}`,
                    'HTTP-Referer': 'https://englishaidol.com',
                    'X-Title': 'English AI Dol - IELTS Speaking Evaluator'
                },
                body: JSON.stringify(requestBody)
            },
            3,  // Max 3 retries
            2000  // Start with 2 second delay
        );

        console.log('📥 OpenRouter response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenRouter API error:', errorText);

            // Provide more specific error messages
            if (response.status === 429) {
                throw new Error('AI service is temporarily busy. Please wait a moment and try again.');
            } else if (response.status === 413) {
                throw new Error('Audio recording is too large. Please try a shorter response.');
            } else if (response.status >= 500) {
                throw new Error('AI service is temporarily unavailable. Please try again in a few seconds.');
            }

            throw new Error(`AI evaluation failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Gemini response received');

        // Extract the JSON response - OpenRouter uses OpenAI-compatible format
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error('❌ No content in response:', JSON.stringify(data, null, 2));

            // Check for specific error cases
            if (data.error) {
                throw new Error(`AI error: ${data.error.message || data.error}`);
            }

            throw new Error('No content in API response. The AI may have been unable to process the audio.');
        }

        console.log('📄 Content length:', content.length);

        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (e) {
            // Try to clean markdown code blocks if present
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            try {
                parsedContent = JSON.parse(cleanContent);
            } catch (e2) {
                console.error('❌ Failed to parse JSON. Raw content:', content.substring(0, 500));
                throw new Error('Failed to parse AI response. Please try again.');
            }
        }

        // Validate required fields
        if (!parsedContent.metrics) {
            console.error('❌ Missing metrics in response');
            throw new Error('Invalid AI response format. Please try again.');
        }

        console.log('✅ Evaluation successful:', {
            hasTranscription: !!parsedContent.transcription,
            hasFeedback: !!parsedContent.feedback,
            metrics: parsedContent.metrics
        });

        return new Response(
            JSON.stringify(parsedContent),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        );

    } catch (error) {
        console.error('❌ Error:', error.message);

        // Determine appropriate status code
        let statusCode = 500;
        if (error.message?.includes('too large')) {
            statusCode = 413;
        } else if (error.message?.includes('busy') || error.message?.includes('rate')) {
            statusCode = 429;
        }

        return new Response(
            JSON.stringify({
                error: error.message || 'An unexpected error occurred during evaluation'
            }),
            {
                status: statusCode,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        );
    }
});
