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
        const { audio, prompt } = await req.json();

        if (!audio) {
            throw new Error('No audio data provided');
        }

        const googleApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!googleApiKey) {
            throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to your Supabase Edge Function secrets.');
        }

        console.log('🎤 Analyzing audio with Gemini 2.5 Flash (Direct Google API)...');
        console.log('📊 Audio data length:', audio.length);
        console.log('📝 Prompt text:', prompt);

        // System prompt for pronunciation analysis
        const systemPrompt = `You are an expert IELTS Speaking Examiner analyzing a student's spoken response.

CRITICAL: You are receiving ACTUAL AUDIO, not just text. Analyze the REAL pronunciation, intonation, stress patterns, and rhythm from the audio you hear.

Evaluate based on IELTS Speaking criteria:
- Pronunciation: clarity, individual sounds, accent comprehensibility
- Intonation: pitch variation, tone appropriateness
- Stress: word stress and sentence stress patterns
- Rhythm: pacing, natural flow, chunking

Return ONLY a valid JSON object with this EXACT structure:
{
  "transcription": "What the student actually said (transcribe the audio)",
  "feedback": "Brief, encouraging feedback (2-3 sentences) focusing on what they did well and ONE key area to improve.",
  "enhancedSentence": "A Band 8-9 IELTS-level version of their answer. Use: (1) sophisticated vocabulary & idiomatic expressions, (2) complex grammatical structures (conditionals, relative clauses, passive voice), (3) natural linking words & discourse markers, (4) precise academic/formal language while maintaining conversational flow. This should sound like a native speaker with excellent English.",
  "metrics": {
    "pronunciation": <0-100 integer>,
    "intonation": <0-100 integer>,
    "stress": <0-100 integer>,
    "rhythm": <0-100 integer>
  },
  "detailedAnalysis": {
    "pronunciation": "Specific comment on actual sounds you heard - which sounds were clear/unclear",
    "intonation": "Specific comment on the pitch patterns and tone you heard in their voice",
    "stress": "Specific comment on how they stressed words and sentences in the audio",
    "rhythm": "Specific comment on the pacing and flow you heard"
  }
}`;

        const userPrompt = `Question: "${prompt}"

Listen to the student's spoken response and provide detailed pronunciation analysis based on what you HEAR in the audio.`;

        // Use Google Gemini API directly with proper audio support
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    text: `${systemPrompt}\n\n${userPrompt}`
                                },
                                {
                                    inline_data: {
                                        mime_type: 'audio/webm',
                                        data: audio
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        console.log('📥 Google API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Google API error:', errorText);
            throw new Error(`Google Gemini API error: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Gemini response received');
        console.log('🔍 Raw response:', JSON.stringify(data, null, 2));

        // Extract the JSON response from Gemini
        const content = data.candidates[0].content.parts[0].text;
        console.log('📄 Content:', content);

        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (e) {
            // Try to clean markdown code blocks if present
            const cleanContent = content.replace(/```json\n?|\n?```/g, '');
            parsedContent = JSON.parse(cleanContent);
        }

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
        console.error('Error:', error);
        return new Response(
            JSON.stringify({
                error: error.message || 'An unexpected error occurred'
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        );
    }
});
