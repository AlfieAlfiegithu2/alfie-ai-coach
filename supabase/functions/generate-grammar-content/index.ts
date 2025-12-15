
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { topic, topic_id, level, count = 5 } = await req.json();

        if (!topic || !level || !topic_id) {
            throw new Error('Topic, topic_id, and level are required');
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing');
        }
        if (!supabaseUrl) {
            throw new Error('SUPABASE_URL is missing');
        }
        if (!supabaseServiceKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `
      You are an expert IELTS Grader and Content Creator.
      Create ${count} grammar exercises for the topic: "${topic}" at "${level}" level.

      Format must be a valid JSON array of objects. Do not wrap in markdown code blocks. Clean JSON only.
      
      Schema for each object:
      {
        "exercise_type": "multiple_choice" | "fill_in_blank" | "error_correction",
        "question": "The string containing the question text or sentence",
        "correct_answer": "The correct answer string",
        "incorrect_answers": ["string", "string", "string"], // Only for multiple_choice, make sure they are plausible distractors
        "explanation": "A clear, concise explanation of why the answer is correct (max 30 words)",
        "instruction": "Instruction for the student (e.g., 'Choose the correct word', 'Fill in the blank')",
        "difficulty": 1, 2, or 3 (integer, 1=easy, 2=medium, 3=hard),
        "sentence_with_blank": "Sentence with _____ for the blank" // Optional, for fill_in_blank
      }

      Ensure a mix of exercise types if appropriate, but focusing on multiple_choice is fine for beginners.
      Verify the JSON is valid.
    `;

        console.log(`Generating exercises for ${topic}...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let exercises;
        try {
            exercises = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse JSON:", jsonStr);
            throw new Error("Failed to parse generated JSON: " + jsonStr.substring(0, 100));
        }

        if (!Array.isArray(exercises)) {
            throw new Error("Generated content is not an array");
        }

        console.log(`Generated ${exercises.length} exercises. Inserting into DB...`);

        const insertedResults = [];

        // Insert exercises sequentially
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];

            // 1. Insert into grammar_exercises
            const { data: exerciseData, error: exerciseError } = await supabase
                .from('grammar_exercises')
                .insert({
                    topic_id: topic_id,
                    exercise_type: ex.exercise_type,
                    difficulty: ex.difficulty || 1,
                    exercise_order: i + 1,
                })
                .select()
                .single();

            if (exerciseError) {
                console.error("Error inserting exercise:", exerciseError);
                continue;
            }

            // 2. Insert into grammar_exercise_translations
            const { error: translationError } = await supabase
                .from('grammar_exercise_translations')
                .insert({
                    exercise_id: exerciseData.id,
                    language_code: 'en',
                    question: ex.question,
                    instruction: ex.instruction,
                    correct_answer: ex.correct_answer,
                    incorrect_answers: ex.incorrect_answers || [],
                    explanation: ex.explanation,
                    sentence_with_blank: ex.sentence_with_blank,
                });

            if (translationError) {
                console.error("Error inserting translation:", translationError);
                // Cleanup exercise? No, just leave it or improve later
            } else {
                insertedResults.push(exerciseData.id);
            }
        }

        return new Response(JSON.stringify({ success: true, count: insertedResults.length, insertedIds: insertedResults }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
