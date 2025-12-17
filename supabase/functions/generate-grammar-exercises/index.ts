/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { lesson_id, topic_id, language_code = 'en', language_name = 'English', topic_title } = await req.json();

        if (!topic_id) throw new Error('topic_id is required');

        const apiKey = Deno.env.get('OPENROUTER_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fetch existing English exercises to reference (or check if we need to create them)
        const { data: existingExercises } = await supabase
            .from('grammar_exercises')
            .select(`
                *,
                grammar_exercise_translations!inner(*)
            `)
            .eq('topic_id', topic_id)
            .eq('grammar_exercise_translations.language_code', 'en')
            .order('exercise_order');

        const isEnglish = language_code === 'en';
        let exercisesToProcess = existingExercises || [];

        // If English and we have fewer than 20, we need to generate/append.
        // For simplicity, if we are generating English, we will regenerate ALL 20 to ensuring a good mix, 
        // OR we could just add. Let's regenerate to be clean if requested for EN.
        // But if user asks for specific language, we should use EN as base.

        // Strategy:
        // If (isEnglish): Generate 20 new exercises. Delete old ones? Or Upsert?
        // To avoid id complexity, if (isEnglish), we'll wipe and recreate for this topic OR just add.
        // Let's assume we want to ensure 20 exist.

        let prompt = '';

        if (isEnglish) {
            prompt = `
                You are an expert IELTS Grammar Coach.
                Topic: "${topic_title}".
                
                TASK: Create exactly 20 distinct, high-quality grammar exercises for this topic.
                The exercises should vary in difficulty (1-3) and type.
                
                Types distribution:
                - 8 Fill in the blank (filling missing auxiliary, verb form, etc.)
                - 5 Multiple Choice
                - 4 Sentence Transformation (Rewrite sentence X to mean Y using...)
                - 3 Error Correction (Find and fix the mistake)
                
                Output JSON structure:
                {
                    "exercises": [
                        {
                            "type": "fill_in_blank" | "multiple_choice" | "sentence_transformation" | "error_correction",
                            "difficulty": 1 | 2 | 3,
                            "question": "The actual question text or sentence",
                            "instruction": "What student should do (in English)",
                            "correct_answer": "The answer",
                            "incorrect_answers": ["A", "B", "C"] (only for multiple_choice),
                            "sentence_with_blank": "I ___ (go) home." (for fill_in_blank, use ___ for blank),
                            "explanation": "Why this is correct",
                            "hint": "A helpful hint",
                            "incorrect_sentence": "I goed home." (for error_correction),
                            "error_highlight": "goed" (for error_correction),
                            "original_sentence": "I went home." (for sentence_transformation source),
                            "transformation_type": "active to passive" (or similar),
                            "starting_word": "Home..." (optional for transformation)
                        }
                    ]
                }
            `;
        } else {
            // Localization Mode
            if (!exercisesToProcess.length) {
                // No English exercises to translate! 
                // We should error or trigger English generation first?
                // Let's error.
                throw new Error('No English exercises found to translate. Please generate English exercises first.');
            }

            // We need to translate the *Instructions*, *Explanations*, and *Hints* of the existing exercises.
            // We pass the existing exercises to the AI.
            // To save tokens, we might map them to a lighter structure.
            const simplifiedExercises = exercisesToProcess.map(ex => {
                const tr = ex.grammar_exercise_translations[0];
                return {
                    id: ex.id,
                    type: ex.exercise_type,
                    question: tr.question, // English question (keeps strict)
                    instruction: tr.instruction,
                    explanation: tr.explanation,
                    hint: tr.hint,
                    correct_answer: tr.correct_answer
                };
            });

            prompt = `
                You are an expert Translator and Grammar Coach.
                Target Language: ${language_name} (${language_code}).
                Topic: "${topic_title}".
                
                TASK: Translate/Localize the instructions, explanations, and hints for the following ${simplifiedExercises.length} grammar exercises.
                The "Question" itself usually remains in English (as we are learning English), but the INSTRUCTIONS and EXPLANATIONS must be in ${language_name} to help the learner.
                
                Input Data: ${JSON.stringify(simplifiedExercises)}
                
                Output JSON structure:
                {
                    "translations": [
                        {
                            "id": "original_exercise_id",
                            "instruction": "Translated instruction",
                            "explanation": "Translated explanation",
                            "hint": "Translated hint"
                        }
                    ]
                }
            `;
        }

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://alfie-ai-coach.com',
                'X-Title': 'Alfie Grammar Exercises'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.7
            })
        });

        if (!openRouterResponse.ok) {
            throw new Error(await openRouterResponse.text());
        }

        const aiData = await openRouterResponse.json();
        const content = JSON.parse(aiData.choices[0].message.content);

        if (isEnglish) {
            // Insert NEW exercises
            const newExercises = content.exercises;

            // First, delete existing english translation mappings for this topic? 
            // Or delete the exercises entirely? 
            // If other languages link to these exercises, deleting them breaks other languages.
            // But we want to "Make 20".
            // If we just add, we might duplicate.
            // Let's Wipe ALL exercises for this topic to be safe and clean, assuming we will regenerate other languages later.
            // This is drastic but requested "Make 20 questions".
            // Since we are batch processing, we can re-run for all languages.

            // Delete all exercises for this topic
            await supabase.from('grammar_exercises').delete().eq('topic_id', topic_id);

            // Insert new ones
            for (let i = 0; i < newExercises.length; i++) {
                const ex = newExercises[i];

                // 1. Insert Base Exercise
                const { data: insertedExercise, error: exError } = await supabase
                    .from('grammar_exercises')
                    .insert({
                        topic_id: topic_id,
                        exercise_type: ex.type,
                        difficulty: ex.difficulty,
                        exercise_order: i + 1,
                        transformation_type: ex.transformation_type
                    })
                    .select()
                    .single();

                if (exError) throw exError;

                // 2. Insert English Translation
                const { error: trError } = await supabase
                    .from('grammar_exercise_translations')
                    .insert({
                        exercise_id: insertedExercise.id,
                        language_code: 'en',
                        question: ex.question || ex.sentence_with_blank || ex.incorrect_sentence || ex.original_sentence, // Fallback logic
                        instruction: ex.instruction,
                        correct_answer: ex.correct_answer,
                        incorrect_answers: ex.incorrect_answers,
                        explanation: ex.explanation,
                        hint: ex.hint,
                        sentence_with_blank: ex.sentence_with_blank,
                        incorrect_sentence: ex.incorrect_sentence,
                        original_sentence: ex.original_sentence
                    });

                if (trError) throw trError;
            }
        } else {
            // Localization: Insert translations for existing exercises
            const translations = content.translations;

            for (const tr of translations) {
                // Find original to get the static data (question, correct answer, etc) which doesn't change
                const original = exercisesToProcess.find(e => e.id === tr.id);

                if (!original) continue; // Safety check

                const originalTr = original.grammar_exercise_translations[0]; // English version

                await supabase
                    .from('grammar_exercise_translations')
                    .upsert({
                        exercise_id: tr.id,
                        language_code: language_code,
                        question: originalTr.question, // Keep English Question
                        instruction: tr.instruction,
                        correct_answer: originalTr.correct_answer, // Keep English Answer
                        incorrect_answers: originalTr.incorrect_answers,
                        explanation: tr.explanation,
                        hint: tr.hint,
                        sentence_with_blank: originalTr.sentence_with_blank,
                        incorrect_sentence: originalTr.incorrect_sentence,
                        original_sentence: originalTr.original_sentence
                    }, { onConflict: 'exercise_id,language_code' });
            }
        }

        return new Response(JSON.stringify({ success: true, count: isEnglish ? content.exercises.length : content.translations.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
