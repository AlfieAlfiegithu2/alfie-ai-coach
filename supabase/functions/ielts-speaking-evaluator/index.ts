import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        let requestBody;
        try {
            requestBody = await req.json();
        } catch (parseError) {
            console.error('❌ Failed to parse request body:', parseError);
            throw new Error('Invalid request body - could not parse JSON');
        }

        const { audio, prompt } = requestBody;

        if (!audio) {
            throw new Error('No audio data provided');
        }

        if (!prompt) {
            throw new Error('No prompt provided');
        }

        // Check audio size (base64 encoded)
        const audioSizeKB = audio.length / 1024;
        const audioSizeMB = audioSizeKB / 1024;
        console.log(`📊 Audio size: ${audioSizeKB.toFixed(0)} KB (${audioSizeMB.toFixed(2)} MB)`);

        // Warn if audio is very large (over 5MB base64 ≈ 3.75MB actual)
        if (audioSizeMB > 10) {
            console.warn('⚠️ Audio file is very large, may cause issues');
        }

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not configured. Please add it to your Supabase Edge Function secrets.');
        }

        console.log('🎤 Analyzing audio...');
        console.log('📝 Prompt text:', prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''));
        console.log('🔑 API Key present:', !!geminiApiKey, 'Length:', geminiApiKey?.length || 0);

        // Expert IELTS examiner evaluation prompt
        const systemPrompt = `You are Dr. Sarah Mitchell, a world-renowned IELTS examiner from Cambridge University with 25 years of experience. You have a PhD in Applied Linguistics and specialize in evaluating non-native English speakers.

YOUR APPROACH: You evaluate speech based on the official IELTS Speaking criteria. You are KIND but HONEST - giving false praise helps no one.

EVALUATION CRITERIA (0-100 scale):

**PRONUNCIATION (0-100) - Sound Accuracy & Clarity**
- Individual sounds: consonants, vowels, word endings
- Intelligibility: how easily understood by native speakers
- Accent impact on comprehension

SCORING:
- 85-100: Native-like clarity, minimal accent interference
- 70-84: Clear and easily understood, minor accent features
- 55-69: Generally intelligible with some unclear sounds
- 40-54: Frequent unclear sounds affecting comprehension
- 0-39: Difficult to understand

**VOCABULARY (0-100) - Lexical Resource**
- Range: variety of words and expressions used
- Appropriateness: correct word choices for context
- Collocations: natural word combinations
- Idiomatic language: use of phrases and expressions

SCORING:
- 85-100: Wide, sophisticated vocabulary with natural idioms
- 70-84: Good range with some less common vocabulary
- 55-69: Adequate vocabulary for familiar topics
- 40-54: Limited vocabulary, repetitive
- 0-39: Very basic vocabulary only

**GRAMMAR (0-100) - Grammatical Range & Accuracy**
- Sentence structures: simple and complex sentences
- Tense usage: appropriate and consistent
- Articles, prepositions, agreement
- Error frequency and impact

SCORING:
- 85-100: Wide range of structures, rare errors
- 70-84: Good variety, mostly accurate
- 55-69: Mix of structures, noticeable errors
- 40-54: Basic structures, frequent errors
- 0-39: Very limited structures, constant errors

**INTONATION (0-100) - Pitch & Stress Patterns**
- Pitch variation: rise/fall patterns
- Word stress: correct syllable emphasis
- Sentence stress: emphasis on key words
- Natural rhythm and flow

SCORING:
- 85-100: Natural, native-like patterns
- 70-84: Good variation, occasional flatness
- 55-69: Some variation but often monotone
- 40-54: Mostly flat or unnatural patterns
- 0-39: No discernible patterns

**FLUENCY (0-100) - Flow & Coherence**
- Speed: appropriate pace
- Hesitation: natural vs excessive pauses
- Self-correction: frequency and smoothness
- Coherence: logical flow of ideas

SCORING:
- 85-100: Smooth, effortless speech
- 70-84: Generally fluent with minor hesitations
- 55-69: Noticeable pauses but maintains flow
- 40-54: Frequent pauses, choppy delivery
- 0-39: Very slow, fragmented speech

BE HONEST: A score of 60-70 is GOOD for most learners. Scores above 85 should be RARE.

Return ONLY valid JSON:
{
  "transcription": "What you actually heard the student say",
  "feedback": "Honest, specific feedback. What did they do well? What needs improvement? Be encouraging but truthful.",
  "enhancedSentence": "A natural Band 8-9 answer - sophisticated but conversational.",
  "metrics": {
    "pronunciation": <0-100>,
    "vocabulary": <0-100>,
    "grammar": <0-100>,
    "intonation": <0-100>,
    "fluency": <0-100>
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
      "word": "each word from transcription",
      "type": "correct | pronunciation_error | grammar_error | vocabulary_issue",
      "note": "Specific issue for non-correct words"
    }
  ],
  "overallAssessment": "Brief summary of speaking level and top priority for improvement"
}

For word_highlights:
- "correct" = used/pronounced well (green)
- "pronunciation_error" = sound was wrong (red)
- "grammar_error" = grammatical mistake (orange)
- "vocabulary_issue" = awkward word choice (yellow)`;

        const userPrompt = `IELTS Speaking Question: "${prompt}"

Listen to this student's response and evaluate it AS A NATIVE SPEAKER WOULD HEAR IT. 

Be honest about the quality. Compare to how an educated native speaker would say the same thing. If pronunciation is poor, say so specifically. If it's good, acknowledge that too.

Remember: Most non-native speakers score 55-75. Scores above 85 are rare.`;

        // Gemini 3.0 Flash - latest and fastest model for audio evaluation
        // Fallback to Gemini 2.5 Flash, then 2.0 Flash
        const models = ['gemini-3-flash-preview', 'gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash'];
        let response;
        let modelUsed;
        let lastError = '';

        for (const modelName of models) {
            console.log(`📡 Trying Gemini API (model: ${modelName})...`);
            console.log(`📊 Audio size for this request: ${(audio.length / 1024).toFixed(0)} KB`);

            try {
                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: `${systemPrompt}\n\n${userPrompt}` },
                                    {
                                        inline_data: {
                                            mime_type: 'audio/webm',
                                            data: audio
                                        }
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.2,
                                topK: 20,
                                topP: 0.8,
                                maxOutputTokens: 4096,
                            }
                        })
                    }
                );

                console.log(`📥 ${modelName} response status:`, response.status);

                if (response.ok) {
                    modelUsed = modelName;
                    break;
                } else {
                    const errorText = await response.text();
                    lastError = errorText;
                    console.error(`❌ ${modelName} failed (status ${response.status}):`, errorText.substring(0, 500));

                    // Try to parse error for more details
                    try {
                        const errorJson = JSON.parse(errorText);
                        console.error(`❌ ${modelName} error details:`, JSON.stringify(errorJson.error || errorJson, null, 2));

                        // If it's a rate limit or quota error, throw immediately
                        if (errorJson.error?.code === 429 || errorJson.error?.status === 'RESOURCE_EXHAUSTED') {
                            throw new Error('API rate limit exceeded. Please try again in a moment.');
                        }
                    } catch (e) {
                        if (e.message?.includes('rate limit')) throw e;
                        // Not JSON, already logged the text
                    }
                }
            } catch (fetchError) {
                console.error(`❌ ${modelName} fetch error:`, fetchError);
                if (fetchError.message?.includes('rate limit')) throw fetchError;
                lastError = fetchError.message || 'Network error';
            }
        }

        if (!response || !response.ok) {
            console.error('❌ All models failed. Last error:', lastError);
            throw new Error(`All Gemini models failed. ${lastError.includes('INVALID_ARGUMENT') ? 'The audio format may not be supported.' : 'Please try again.'}`);
        }

        const data = await response.json();
        console.log(`✅ Gemini response received (model: ${modelUsed})`);

        // Native Gemini format
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            console.error('❌ No content in response. Full response:', JSON.stringify(data, null, 2));
            throw new Error('No content in API response');
        }

        console.log('📄 Content received, length:', content.length);

        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (e) {
            // Try to clean markdown code blocks if present
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            try {
                parsedContent = JSON.parse(cleanContent);
            } catch (e2) {
                console.error('❌ Failed to parse JSON. Content:', content.substring(0, 500));
                throw new Error('Failed to parse AI response as JSON');
            }
        }

        console.log('✅ Successfully parsed response');
        console.log('📊 Scores:', parsedContent.metrics);

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
        console.error('❌ Error in ielts-speaking-evaluator:', error);
        console.error('❌ Error stack:', error.stack);

        // Provide more specific error messages
        let errorMessage = error.message || 'An unexpected error occurred';
        let statusCode = 500;

        if (errorMessage.includes('GEMINI_API_KEY')) {
            statusCode = 503;
        } else if (errorMessage.includes('too long') || errorMessage.includes('size')) {
            errorMessage = 'Audio recording is too long. Please try a shorter recording (under 2 minutes).';
        } else if (errorMessage.includes('parse')) {
            errorMessage = 'Could not process the audio. Please try recording again.';
        }

        return new Response(
            JSON.stringify({
                error: errorMessage,
                details: Deno.env.get('NODE_ENV') === 'development' ? error.stack : undefined
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
