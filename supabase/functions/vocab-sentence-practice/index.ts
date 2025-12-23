// @ts-nocheck - Deno runtime file, TypeScript errors for Deno imports are expected
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-expect-error - Deno std library import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Language code to name mapping
const languageNames: Record<string, string> = {
    'zh': 'Chinese (中文)',
    'zh-TW': 'Traditional Chinese (繁體中文)',
    'es': 'Spanish (Español)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'ar': 'Arabic (العربية)',
    'pt': 'Portuguese (Português)',
    'ru': 'Russian (Русский)',
    'hi': 'Hindi (हिन्दी)',
    'vi': 'Vietnamese (Tiếng Việt)',
    'th': 'Thai (ไทย)',
    'id': 'Indonesian (Bahasa Indonesia)',
    'tr': 'Turkish (Türkçe)',
    'it': 'Italian (Italiano)',
    'nl': 'Dutch (Nederlands)',
    'pl': 'Polish (Polski)',
    'uk': 'Ukrainian (Українська)',
    'bn': 'Bengali (বাংলা)',
    'ur': 'Urdu (اردو)',
    'fa': 'Persian (فارسی)',
    'en': 'English',
};

async function callGeminiFlashLite(prompt: string, apiKey: string, retryCount = 0) {
    console.log(`🚀 Attempting Gemini 2.5 Flash Lite API call via OpenRouter (attempt ${retryCount + 1}/2)...`);
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://englishaidol.com',
                'X-Title': 'Vocabulary Sentence Practice'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash-lite',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gemini Flash Lite API Error:', errorText);
            throw new Error(`Gemini Flash Lite API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ Gemini Flash Lite API call successful`);

        return data.choices?.[0]?.message?.content ?? '';
    } catch (error) {
        console.error(`❌ Gemini Flash Lite attempt ${retryCount + 1} failed:`, (error as any).message);

        if (retryCount < 1) {
            console.log(`🔄 Retrying Gemini Flash Lite API call in 500ms...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return callGeminiFlashLite(prompt, apiKey, retryCount + 1);
        }

        throw error;
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    try {
        // @ts-expect-error - Deno global is available at runtime
        const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

        if (!openRouterApiKey) {
            console.error('❌ No OpenRouter API key configured.');
            return new Response(JSON.stringify({
                success: false,
                error: 'Sentence practice service temporarily unavailable.',
                details: 'No OpenRouter API key configured'
            }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        let body;
        try {
            body = await req.json();
        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Invalid JSON in request body',
                success: false
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { sentence, vocabularyWord, targetLanguage } = body;

        console.log('📝 Sentence practice request:', {
            sentenceLength: sentence?.length || 0,
            vocabularyWord,
            targetLanguage
        });

        if (!sentence || typeof sentence !== 'string' || sentence.trim().length < 3) {
            return new Response(JSON.stringify({
                error: 'Please provide a sentence to evaluate.',
                success: false
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!vocabularyWord || typeof vocabularyWord !== 'string') {
            return new Response(JSON.stringify({
                error: 'Please provide the vocabulary word.',
                success: false
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const langName = languageNames[targetLanguage] || languageNames['en'] || 'English';
        const feedbackLanguageInstruction = targetLanguage && targetLanguage !== 'en'
            ? `Write ALL your feedback in ${langName}. The student's native language is ${langName}, so explain everything in their language to help them understand better.`
            : 'Write your feedback in English.';

        const evaluationPrompt = `You are an expert English coach. Evaluate this student's sentence for the word "${vocabularyWord}".

STUDENT'S SENTENCE: "${sentence}"

${feedbackLanguageInstruction}

Your response must be valid JSON with these fields:
{
  "isCorrect": boolean (true if word usage AND grammar are perfect),
  "wordUsageCorrect": boolean,
  "grammarCorrect": boolean,
  "feedback": "A clear, helpful explanation (around 30-40 words) in ${langName} explaining the usage or grammar mistake and how to improve it. Be detailed but specific.",
  "correctedSentence": "Corrected English sentence.",
  "encouragement": "A warm, encouraging phrase in ${langName}."
}

Return ONLY valid JSON.`;

        const response = await callGeminiFlashLite(evaluationPrompt, openRouterApiKey);

        if (!response || response.trim().length === 0) {
            console.error('❌ Empty response received from Gemini');
            return new Response(JSON.stringify({
                success: false,
                error: 'Received empty response. Please try again.',
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Try to parse JSON response
        let parsedResponse;
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResponse = JSON.parse(jsonMatch[0]);
            } else {
                parsedResponse = JSON.parse(response);
            }
        } catch (parseError) {
            console.error('❌ Failed to parse JSON response:', parseError);
            parsedResponse = {
                isCorrect: false,
                wordUsageCorrect: false,
                grammarCorrect: false,
                feedback: response,
                correctedSentence: sentence,
                encouragement: "Keep practicing! 💪"
            };
        }

        console.log('✅ Sentence evaluation generated successfully');

        return new Response(JSON.stringify({
            success: true,
            ...parsedResponse,
            vocabularyWord,
            originalSentence: sentence
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('❌ Sentence practice error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error?.message || 'Failed to evaluate sentence. Please try again.',
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
