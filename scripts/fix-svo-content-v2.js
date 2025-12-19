
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LESSON_ID = '5cb71d31-a580-41cd-ac09-d01e143d3476';

async function fixSVOContent() {
    console.log("🛠️ Fixing Sentence Structure (SVO) Content...");

    // 0. Get Topic ID
    const { data: lesson } = await supabase.from('grammar_lessons').select('topic_id').eq('id', LESSON_ID).single();
    if (!lesson) {
        console.error("❌ Lesson not found!");
        return;
    }
    const TOPIC_ID = lesson.topic_id;
    console.log(`topic_id: ${TOPIC_ID}`);

    // 1. Update Theory Content
    const theoryPayload = {
        theory_title: "Sentence Structure: The SVO Rule",
        theory_definition: "English is a rigidly **Subject-Verb-Object (SVO)** language. This means the standard order for a basic sentence is strict: first the **Subject** (who), then the **Verb** (action), and finally the **Object** (receiver). Unlike many other languages, changing this order in English changes the meaning completely.",
        theory_formation: "**Subject (S) + Verb (V) + Object (O)**\n\n*   **S - Subject**: The person, place, or thing doing the action.\n*   **V - Verb**: The action word.\n*   **O - Object**: The person or thing receiving the action.",
        theory_usage: "Use the SVO structure for all standard statements/declarative sentences. It is the foundation of English communication. \n\n*   **Correct**: I (S) love (V) you (O).\n*   **Incorrect**: I you love. (SOV)",
        theory_common_mistakes: "1. Placing the Object before the Verb (common in Asian languages).\n2. Putting time phrases between the Verb and Object (e.g. 'I ate yesterday pizza'). Time goes at the end.\n3. Forgetting the Subject (e.g. 'Is raining' instead of 'It is raining').",
        rules: [
            "**Strict Order**: Always follow S-V-O for statements. *Exceptions include questions and passive voice.*",
            "**Adverbs of Frequency**: Adverbs like *always, often, never* go **before** the main verb (S-Adv-V-O).",
            "**Place & Time Rule**: Put 'Place' and then 'Time' at the very end of the sentence (S-V-O + Place + Time).",
            "**Transitivity**: Only Transitive verbs (like *buy, eat*) need an Object. Intransitive verbs (like *sleep, arrive*) stop after the Verb."
        ],
        examples: [
            { "sentence": "The dog chased the cat.", "explanation": "Classic SVO: Dog (Subject), chased (Verb), cat (Object)." },
            { "sentence": "I usually drink coffee in the morning.", "explanation": "SVO with Adverb 'usually' before verb, and Time 'in the morning' at the end." },
            { "sentence": "She plays the piano beautifully.", "explanation": "SVO with Adverb of Manner 'beautifully' at the end." },
            { "sentence": "They bought a new house last year.", "explanation": "Subject + Verb + Object + Time." },
            { "sentence": "My friend passed the exam.", "explanation": "Clear Subject, Verb, and Object structure." }
        ],
        localized_tips: "Remember: 'Place before Time'. If you have both, say where it happened, then when it happened.",
        updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
        .from('grammar_lesson_translations')
        .update(theoryPayload)
        .eq('lesson_id', LESSON_ID)
        .eq('language_code', 'en');

    if (updateError) {
        console.error("❌ Failed to update theory:", updateError);
    } else {
        console.log("✅ Theory updated successfully.");
    }

    // 2. Add Exercises
    console.log("Adding Exercises...");

    // Check existing exercises - delete carefully via topic_id and join? 
    // Actually, grammar_exercises has topic_id, but how do we know which belong to this LESSON?
    // The schema shows `grammar_exercises` relates to `topic_id`, NOT `lesson_id` directly?
    // Wait, let's re-read schema.
    // Line 80: `topic_id UUID NOT NULL REFERENCES grammar_topics(id)`
    // Line 37: `grammar_lessons` relates to `topic_id`.
    // So Exercises belong to a Topic, not a specific Lesson?
    // If so, 1 Topic = 1 Lesson usually?
    // If multiple lessons per topic, exercises might be mixed.
    // But for SVO, it's likely 1:1.
    // I will delete exercises for this TOPIC_ID.

    const { data: existingEx } = await supabase.from('grammar_exercises').select('id').eq('topic_id', TOPIC_ID);
    if (existingEx && existingEx.length > 0) {
        console.log(`⚠️ Found ${existingEx.length} existing exercises for topic. Deleting...`);
        // Note: Translation table entries cascade delete
        await supabase.from('grammar_exercises').delete().eq('topic_id', TOPIC_ID);
    }

    const exercises = [
        {
            type: "multiple_choice",
            question: "Choose the correct sentence order:",
            options: ["I eat every day an apple.", "I eat an apple every day.", "An apple I eat every day."],
            correct_answer: "I eat an apple every day.",
            explanation: "In English, time expressions ('every day') usually go at the end of the sentence used SVO.",
            meta: { difficulty: 1, exercise_order: 1 }
        },
        {
            type: "drag_drop_reorder",
            question: "Reorder the words to form a correct SVO sentence.",
            correct_answer: "Sarah likes chocolate very much",
            explanation: "Subject (Sarah) + Verb (likes) + Object (chocolate).",
            meta: { difficulty: 1, exercise_order: 2, correct_order: ["Sarah", "likes", "chocolate", "very", "much"] }
        },
        {
            type: "multiple_choice",
            question: "Which sentence has the correct structure?",
            options: ["She speaks English well.", "She speaks well English.", "She English speaks well."],
            correct_answer: "She speaks English well.",
            explanation: "The Object (English) must immediately follow the Verb (speaks). Adverbs (well) come after.",
            meta: { difficulty: 2, exercise_order: 3 }
        },
        {
            type: "drag_drop_reorder",
            question: "Arrange the sentence correctly.",
            correct_answer: "We went to the park yesterday",
            explanation: "Subject (We) + Verb (went) + Place (to the park) + Time (yesterday).",
            meta: { difficulty: 2, exercise_order: 4, correct_order: ["We", "went", "to", "the", "park", "yesterday"] }
        },
        {
            type: "multiple_choice",
            question: "Identify the Subject in this sentence: 'The big red bus arrived late.'",
            options: ["The big red bus", "arrived", "late"],
            correct_answer: "The big red bus",
            explanation: "The Subject is the entire noun phrase performing the action.",
            meta: { difficulty: 2, exercise_order: 5 }
        }
    ];

    for (const ex of exercises) {
        // A. Insert into base table
        const basePayload = {
            topic_id: TOPIC_ID,
            exercise_type: ex.type,
            difficulty: ex.meta.difficulty,
            exercise_order: ex.meta.exercise_order
        };

        if (ex.type === 'drag_drop_reorder' && ex.meta.correct_order) {
            basePayload.correct_order = ex.meta.correct_order;
        }

        const { data: insertedBase, error: baseError } = await supabase
            .from('grammar_exercises')
            .insert(basePayload)
            .select('id')
            .single();

        if (baseError) {
            console.error("❌ Failed to insert base exercise:", baseError);
            continue;
        }

        const exerciseId = insertedBase.id;

        // B. Insert into translation table
        const transPayload = {
            exercise_id: exerciseId,
            language_code: 'en',
            question: ex.question,
            correct_answer: ex.correct_answer,
            explanation: ex.explanation,
            incorrect_answers: ex.type === 'multiple_choice'
                ? ex.options.filter(o => o !== ex.correct_answer)
                : []
        };

        // For reorder, we might not pass 'options' in incorrect_answers, 
        // but frontend usually needs the shuffled words. 
        // Typically the frontend shuffles 'correct_order'.

        const { error: transError } = await supabase
            .from('grammar_exercise_translations')
            .insert(transPayload);

        if (transError) {
            console.error("❌ Failed to insert exercise translation:", transError);
        } else {
            console.log(`✅ Added exercise: ${ex.question.substring(0, 30)}...`);
        }
    }
}

fixSVOContent();
