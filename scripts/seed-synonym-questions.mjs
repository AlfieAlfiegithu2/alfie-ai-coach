// Script to seed questions for Synonym Match tests
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing
const envPath = path.resolve('apps/main/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/"/g, '');
    }
});

const supabase = createClient(
    env['VITE_SUPABASE_URL'],
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg'
);

// Sample synonym pairs for questions
const synonymPairs = [
    { word: "HAPPY", correct: "Joyful", wrong: ["Sad", "Angry", "Tired"] },
    { word: "FAST", correct: "Quick", wrong: ["Slow", "Heavy", "Old"] },
    { word: "BIG", correct: "Large", wrong: ["Small", "Tiny", "Short"] },
    { word: "SMART", correct: "Intelligent", wrong: ["Foolish", "Dull", "Lazy"] },
    { word: "BRAVE", correct: "Courageous", wrong: ["Cowardly", "Timid", "Weak"] },
    { word: "BEAUTIFUL", correct: "Gorgeous", wrong: ["Ugly", "Plain", "Dull"] },
    { word: "ANGRY", correct: "Furious", wrong: ["Calm", "Peaceful", "Happy"] },
    { word: "COLD", correct: "Chilly", wrong: ["Hot", "Warm", "Burning"] },
    { word: "RICH", correct: "Wealthy", wrong: ["Poor", "Needy", "Broke"] },
    { word: "SAD", correct: "Sorrowful", wrong: ["Happy", "Joyful", "Cheerful"] },
    { word: "DIFFICULT", correct: "Challenging", wrong: ["Easy", "Simple", "Effortless"] },
    { word: "STRONG", correct: "Powerful", wrong: ["Weak", "Feeble", "Fragile"] },
    { word: "QUIET", correct: "Silent", wrong: ["Loud", "Noisy", "Boisterous"] },
    { word: "OLD", correct: "Ancient", wrong: ["New", "Modern", "Fresh"] },
    { word: "SMALL", correct: "Tiny", wrong: ["Huge", "Giant", "Massive"] },
    { word: "CLEAN", correct: "Spotless", wrong: ["Dirty", "Filthy", "Grimy"] },
    { word: "FUNNY", correct: "Hilarious", wrong: ["Boring", "Serious", "Dull"] },
    { word: "KIND", correct: "Generous", wrong: ["Mean", "Cruel", "Selfish"] },
    { word: "THIN", correct: "Slender", wrong: ["Fat", "Thick", "Wide"] },
    { word: "TIRED", correct: "Exhausted", wrong: ["Energetic", "Active", "Lively"] },
];

async function seedSynonymQuestions() {
    console.log('🔍 Fetching existing synonym match tests...');

    const { data: tests, error: fetchError } = await supabase
        .from('skill_tests')
        .select('id, title, test_order')
        .eq('skill_slug', 'synonym-match')
        .order('test_order', { ascending: true });

    if (fetchError) {
        console.error('❌ Error fetching tests:', fetchError);
        return;
    }

    if (!tests || tests.length === 0) {
        console.log('⚠️ No synonym match tests found. Run seed-synonym-tests.js first.');
        return;
    }

    console.log(`📚 Found ${tests.length} tests. Checking for existing questions...`);

    // Check for existing questions
    const { data: existingQs } = await supabase
        .from('skill_practice_questions')
        .select('id, skill_test_id');

    const testsWithQuestions = new Set((existingQs || []).map(q => q.skill_test_id));

    for (const test of tests) {
        if (testsWithQuestions.has(test.id)) {
            console.log(`⏭️ Skipping ${test.title} - already has questions`);
            continue;
        }

        console.log(`📝 Adding questions for: ${test.title}`);

        // Pick 10 random synonym pairs for this test
        const shuffled = [...synonymPairs].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, 10);

        const questions = picked.map((pair) => ({
            skill_test_id: test.id,
            skill_type: 'synonym-match',
            created_by: '30982d39-b842-42e0-94dd-5411ad1e0c4a', // System/admin user
            content: `Select the best SYNONYM for the word "${pair.word}"`,
            question_format: "DefinitionMatch",
            correct_answer: pair.correct,
            incorrect_answers: pair.wrong,
            explanation: `${pair.correct} is a synonym of ${pair.word}.`
        }));

        const { error: insertError } = await supabase
            .from('skill_practice_questions')
            .insert(questions);

        if (insertError) {
            console.error(`❌ Error inserting questions for ${test.title}:`, insertError);
        } else {
            console.log(`✅ Added ${questions.length} questions to ${test.title}`);
        }
    }

    console.log('\n🎉 Seed complete!');
}

seedSynonymQuestions();
