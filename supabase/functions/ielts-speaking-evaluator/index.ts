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

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        
        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not configured. Please add it to your Supabase Edge Function secrets.');
        }

        console.log('🎤 Analyzing audio...');
        console.log('📊 Audio data length:', audio.length);
        console.log('📝 Prompt text:', prompt);

        // Expert native speaker evaluation prompt - STRICT and CRITICAL
        const systemPrompt = `You are Dr. Sarah Mitchell, a world-renowned phonetics professor from Cambridge University with 25 years of experience training IELTS examiners. You have a PhD in Applied Linguistics and have published extensively on non-native English pronunciation patterns.

YOUR APPROACH: You evaluate speech EXACTLY as a native speaker hears it. You compare every utterance to how an educated native British or American speaker would naturally produce it. You are KIND but HONEST - giving false praise helps no one.

CRITICAL EVALUATION FRAMEWORK:

**PRONUNCIATION (0-100) - Individual Sound Accuracy**
Compare each sound to native speaker production:
- Consonants: Are /θ/ (think), /ð/ (this), /r/, /l/, /w/, /v/, /f/, /ŋ/ (sing) correct?
- Vowels: Are long/short vowels distinct? Is /æ/ (cat) vs /e/ (bet) clear? Is /ɜː/ (bird) correct?
- Word endings: Are final consonants (/t/, /d/, /s/, /z/) clearly pronounced or dropped?
- Consonant clusters: Are combinations like /str/, /spl/, /nts/ smooth?

SCORING:
- 85-100: Native-like accuracy, almost no detectable accent
- 70-84: Clear and intelligible, minor accent features
- 55-69: Noticeable errors but mostly understandable
- 40-54: Frequent errors affecting comprehension
- 0-39: Severe errors, difficult to understand

**INTONATION (0-100) - Pitch Movement & Melody**
Native English has distinct pitch patterns:
- Questions rise ↗ at the end (yes/no) or fall ↘ (wh-questions)
- Statements fall ↘ at the end
- Lists have rising ↗ items, falling ↘ final item
- Emphasis creates pitch peaks on important words

SCORING:
- 85-100: Natural pitch variation like a native speaker
- 70-84: Good variation with occasional flatness
- 55-69: Often flat or monotone, some variation
- 40-54: Very flat, sounds robotic or unnatural
- 0-39: No pitch variation, extremely monotone

**STRESS (0-100) - Word & Sentence Stress**
English is a stress-timed language:
- Word stress: imPORtant (not IMportant), deCISion, underSTAND
- Sentence stress: Content words (nouns, verbs, adjectives) are stressed
- Function words (a, the, to, of) are typically unstressed/reduced

SCORING:
- 85-100: Native-like stress patterns throughout
- 70-84: Mostly correct, occasional misplaced stress
- 55-69: Several stress errors, sounds slightly foreign
- 40-54: Frequent wrong stress, hard to follow
- 0-39: No understanding of English stress patterns

**RHYTHM (0-100) - Flow & Pacing**
Native English has a bouncing rhythm with:
- Stressed syllables at regular intervals
- Unstressed syllables compressed between stressed ones
- Natural pauses at phrase boundaries
- Smooth linking between words (e.g., "an_apple" sounds like "anapple")

SCORING:
- 85-100: Smooth, natural flow like a native speaker
- 70-84: Good flow with minor hesitations
- 55-69: Choppy or uneven pacing
- 40-54: Very choppy, syllable-timed (each syllable equal length)
- 0-39: Severely disrupted flow, hard to listen to

BE HONEST: If you hear errors, report them. A score of 60-70 is GOOD for most learners. Scores above 85 should be RARE - reserved for near-native speakers only.

Return ONLY valid JSON:
{
  "transcription": "What you actually heard the student say (include any mispronunciations in brackets if helpful)",
  "feedback": "Honest, specific feedback comparing to native speaker standard. What sounds need work? Be encouraging but truthful.",
  "enhancedSentence": "A natural Band 8-9 answer that sounds like a native speaker - conversational, not overly academic.",
  "metrics": {
    "pronunciation": <0-100>,
    "intonation": <0-100>,
    "stress": <0-100>,
    "rhythm": <0-100>
  },
  "detailedAnalysis": {
    "pronunciation": "List SPECIFIC sounds that differed from native pronunciation. Example: 'The /θ/ in think sounded like /t/. The vowel in important was too short.'",
    "intonation": "Describe the actual pitch patterns. Was it flat? Did pitch rise/fall appropriately?",
    "stress": "Which words had incorrect stress? Example: 'Said IM-por-tant instead of im-POR-tant'",
    "rhythm": "Was the rhythm smooth or choppy? Were words linked naturally?"
  },
  "word_highlights": [
    {
      "word": "each word from transcription",
      "type": "correct | pronunciation_error | stress_error | intonation_issue",
      "note": "Specific issue for non-correct words"
    }
  ],
  "nativeComparison": "Brief note on how far from native speaker level and what to prioritize for improvement"
}

For word_highlights:
- "correct" = pronounced well (green)
- "pronunciation_error" = sound was wrong (red) - include IPA if helpful
- "stress_error" = wrong syllable stressed (orange)
- "intonation_issue" = flat/wrong tone (yellow)`;

        const userPrompt = `IELTS Speaking Question: "${prompt}"

Listen to this student's response and evaluate it AS A NATIVE SPEAKER WOULD HEAR IT. 

Be honest about the quality. Compare to how an educated native speaker would say the same thing. If pronunciation is poor, say so specifically. If it's good, acknowledge that too.

Remember: Most non-native speakers score 55-75. Scores above 85 are rare.`;

        // Try Gemini 2.5 Flash first, fallback to 2.0 Flash
        const models = ['gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash'];
        let response;
        let modelUsed;
        
        for (const modelName of models) {
            console.log(`📡 Trying Gemini API (model: ${modelName})...`);
            
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
                            maxOutputTokens: 2048,
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
                console.warn(`⚠️ ${modelName} failed:`, errorText.substring(0, 200));
            }
        }

        if (!response || !response.ok) {
            throw new Error('All Gemini models failed to process the audio');
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
