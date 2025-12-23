
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { topic_id, language_code, language_name, count = 10 } = await req.json();

        if (!topic_id || !language_code) {
            throw new Error('Missing topic_id or language_code');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Fetch Topic Info
        const { data: topic, error: topicError } = await supabase
            .from('grammar_topics')
            .select('slug')
            .eq('id', topic_id)
            .single();

        if (topicError || !topic) throw new Error('Topic not found');

        console.log(`Generating ${count} exercises for ${topic.slug} in ${language_name}`);

        // 2. Prepare Prompt
        const systemPrompt = `You are an English grammar expert. 
Your task is to generate high-quality, realistic English grammar exercises for the topic: "${topic.slug}".
These exercises will be presented to ${language_name} speakers.

Each exercise should have:
1. A question (in English, or translated to ${language_name} for beginner levels)
2. An instruction (in ${language_name})
3. A sentence with a blank (e.g. "I ___ (go) to school.")
4. The correct answer (e.g. "go")
5. An explanation (in ${language_name})
6. A hint (in ${language_name})

OUTPUT FORMAT:
Return a STRICT JSON array of objects:
[
  {
    "exercise_type": "fill_in_blank",
    "difficulty": 1, 
    "question": "Question text in English",
    "instruction": "Instruction in ${language_name}",
    "sentence_with_blank": "Sentence with ___ blank",
    "correct_answer": "answer",
    "explanation": "Why this is correct (in ${language_name})",
    "hint": "Small hint (in ${language_name})"
  }
]`;

        const userPrompt = `Generate ${count} diverse and realistic exercises for the grammar topic: "${topic.slug}".
Language for instructions/explanations: ${language_name} (${language_code})`;

        // 3. Call Gemini 3.0 Flash
        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                }
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API Error: ${res.status} - ${errText}`);
        }

        const aiData = await res.json();
        let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (content.includes('```')) {
            content = content.replace(/```json/g, '').replace(/```/g, '');
        }
        const exercises = JSON.parse(content.trim());


        // 4. Save to Database
        let savedCount = 0;
        for (const ex of exercises) {
            // 4a. Create base exercise
            const { data: baseEx, error: baseError } = await supabase
                .from('grammar_exercises')
                .insert({
                    topic_id: topic_id,
                    exercise_type: ex.exercise_type || 'fill_in_blank',
                    difficulty: ex.difficulty || 1,
                    exercise_order: 0 // Will adjust later or via serial
                })
                .select()
                .single();

            if (baseError) {
                console.error('Error creating base exercise:', baseError);
                continue;
            }

            // 4b. Create translation
            const { error: transError } = await supabase
                .from('grammar_exercise_translations')
                .insert({
                    exercise_id: baseEx.id,
                    language_code: language_code,
                    question: ex.question,
                    instruction: ex.instruction,
                    sentence_with_blank: ex.sentence_with_blank,
                    correct_answer: ex.correct_answer,
                    explanation: ex.explanation,
                    hint: ex.hint
                });

            if (transError) {
                console.error('Error creating translation:', transError);
            } else {
                savedCount++;
            }
        }

        return new Response(JSON.stringify({ success: true, count: savedCount }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
