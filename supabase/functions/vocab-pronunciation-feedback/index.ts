// @ts-nocheck - Deno runtime file, TypeScript errors for Deno imports are expected
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-expect-error - Deno std library import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function callGeminiWithAudio(
    audioData: string,
    targetWord: string,
    targetIPA: string,
    mimeType: string,
    apiKey: string,
    feedbackLanguage: string = 'en'
) {
    const languageNames: Record<string, string> = {
        'ko': 'Korean', 'vi': 'Vietnamese', 'zh': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
        'yue': 'Cantonese', 'ja': 'Japanese', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'ru': 'Russian', 'pt': 'Portuguese', 'ar': 'Arabic', 'hi': 'Hindi',
        'bn': 'Bengali', 'th': 'Thai', 'id': 'Indonesian', 'ms': 'Malay', 'tr': 'Turkish',
        'tl': 'Filipino', 'my': 'Burmese', 'km': 'Khmer', 'ur': 'Urdu', 'ta': 'Tamil',
        'te': 'Telugu', 'mr': 'Marathi', 'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam',
        'pa': 'Punjabi', 'fa': 'Persian', 'nl': 'Dutch', 'pl': 'Polish', 'uk': 'Ukrainian',
        'ro': 'Romanian', 'el': 'Greek', 'cs': 'Czech', 'hu': 'Hungarian', 'sv': 'Swedish',
        'bg': 'Bulgarian', 'no': 'Norwegian', 'da': 'Danish', 'fi': 'Finnish'
    };

    const displayLanguage = languageNames[feedbackLanguage] || feedbackLanguage;
    const prompt = `You are an expert English pronunciation coach. 
Analyze the student's pronunciation of "${targetWord}" (IPA: /${targetIPA}/).

Rules:
1. Score from 0 to 100 (where 100 is native-like).
2. Score 0 if silent or completely wrong word.
3. Be strict but encouraging.
4. Your feedback MUST be written in ${displayLanguage}. 
5. If it's Chinese, use characters only (no Pinyin). 
6. Return JSON only.

Schema:
{"isCorrect": boolean, "score": number (0-100), "feedback": "One specific tip in ${displayLanguage}"}`;

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];
    let lastError = '';

    for (const modelName of models) {
        try {
            console.log(`📡 Trying Gemini API (model: ${modelName}) for "${targetWord}"...`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inline_data: { mime_type: mimeType, data: audioData } },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 200,
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${modelName} analysis complete`);
                return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
                const errorText = await response.text();
                lastError = errorText;
                console.error(`❌ ${modelName} failed:`, errorText.substring(0, 200));
            }
        } catch (error) {
            console.error(`❌ ${modelName} error:`, (error as any).message);
            lastError = (error as any).message;
        }
    }

    throw new Error(`All Gemini models failed: ${lastError}`);
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
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

        if (!geminiApiKey) {
            console.error('❌ No Gemini API key configured.');
            return new Response(JSON.stringify({
                success: false,
                error: 'Pronunciation feedback service temporarily unavailable.',
                details: 'No Gemini API key configured'
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

        const { audioData, targetWord, targetIPA, mimeType, feedbackLanguage } = body;

        console.log('🎤 Pronunciation request:', { targetWord, lang: feedbackLanguage, audioLen: audioData?.length || 0 });

        if (!audioData || typeof audioData !== 'string') {
            return new Response(JSON.stringify({
                error: 'Please provide audio data.',
                success: false
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!targetWord || typeof targetWord !== 'string') {
            return new Response(JSON.stringify({
                error: 'Please provide the target word.',
                success: false
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const response = await callGeminiWithAudio(
            audioData,
            targetWord,
            targetIPA || '',
            mimeType || 'audio/webm',
            geminiApiKey,
            feedbackLanguage || 'en'
        );

        if (!response || response.trim().length === 0) {
            console.error('❌ Empty response from Gemini');
            return new Response(JSON.stringify({
                success: false,
                error: 'Could not analyze pronunciation. Please try again.',
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Parse JSON response
        let parsedResponse;
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResponse = JSON.parse(jsonMatch[0]);
            } else {
                parsedResponse = JSON.parse(response);
            }
        } catch (parseError) {
            console.error('❌ Parse error:', parseError);
            parsedResponse = {
                isCorrect: false,
                score: 50,
                spokenIPA: '',
                feedback: 'Could not analyze pronunciation. Try again.',
                targetIPA: targetIPA || ''
            };
        }

        console.log('✅ Result:', { score: parsedResponse.score, isCorrect: parsedResponse.isCorrect });

        return new Response(JSON.stringify({
            success: true,
            ...parsedResponse,
            targetWord
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('❌ Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error?.message || 'Failed to analyze pronunciation.',
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
