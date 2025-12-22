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
    console.log(`🎤 Analyzing pronunciation for: "${targetWord}" (Lang: ${feedbackLanguage})`);

    // Simplified prompt for faster response
    const prompt = `Evaluate pronunciation of "${targetWord}" (IPA: /${targetIPA}/).

Rules:
- Score 0 if silent or wrong word
- Be strict on vowels, stress, consonants
- Respond in ${feedbackLanguage} (Chinese: use Hanzi only, no Pinyin)

JSON only:
{"isCorrect":bool,"score":0-100,"feedback":"1 tip in ${feedbackLanguage}"}`;

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: audioData
                            }
                        },
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 100,
                    thinkingConfig: {
                        thinkingLevel: "MINIMAL"
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gemini API Error:', errorText);
            throw new Error(`Gemini API failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Pronunciation analysis complete');

        return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
        console.error('❌ Gemini failed:', (error as any).message);
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
