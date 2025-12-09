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

        const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterApiKey) {
            throw new Error('OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your Supabase Edge Function secrets.');
        }

        console.log('🎤 Analyzing audio with Gemini 2.5 Flash via OpenRouter...');
        console.log('📊 Audio data length:', audio.length);
        console.log('📝 Prompt text:', prompt);

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
        const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openRouterApiKey}`,
                    'HTTP-Referer': 'https://englishaidol.com',
                    'X-Title': 'English AI Dol - IELTS Speaking Evaluator'
                },
                body: JSON.stringify({
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
                    max_tokens: 2048
                })
            }
        );

        console.log('📥 OpenRouter response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenRouter API error:', errorText);
            throw new Error(`OpenRouter API error: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Gemini response received');
        console.log('🔍 Raw response:', JSON.stringify(data, null, 2));

        // Extract the JSON response - OpenRouter uses OpenAI-compatible format
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            console.error('❌ No content in response:', data);
            throw new Error('No content in API response');
        }
        
        console.log('📄 Content:', content);

        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (e) {
            // Try to clean markdown code blocks if present
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            try {
                parsedContent = JSON.parse(cleanContent);
            } catch (e2) {
                console.error('❌ Failed to parse JSON:', cleanContent);
                throw new Error('Failed to parse AI response as JSON');
            }
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
