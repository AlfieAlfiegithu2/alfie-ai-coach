// Script to seed 10 Synonym Match tests
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing since dotenv has path issues
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

async function seedSynonymTests() {
    console.log('Seeding synonym tests...');

    // 1. Check if tests already exist
    const { data: existing, error: fetchError } = await supabase
        .from('skill_tests')
        .select('id')
        .eq('skill_slug', 'synonym-match');

    if (fetchError) {
        console.error('Error fetching tests:', fetchError);
        return;
    }

    if (existing && existing.length > 0) {
        console.log(`Found ${existing.length} existing tests. Skipping seed.`);
        return;
    }

    // 2. Create 10 tests
    const testsToCreate = [];

    for (let i = 1; i <= 10; i++) {
        testsToCreate.push({
            skill_slug: 'synonym-match',
            title: `Synonym Challenge Level ${i}`,
            test_order: i,
            created_by: '30982d39-b842-42e0-94dd-5411ad1e0c4a'
        });
    }

    const { data: createdTests, error: insertError } = await supabase
        .from('skill_tests')
        .insert(testsToCreate)
        .select();

    if (insertError) {
        console.error('Error creating tests:', insertError);
        return;
    }

    console.log(`✅ Created ${createdTests.length} tests. Now adding questions...`);

    // 3. Add dummy questions for each test
    const questionsToCreate = [];

    for (const test of createdTests) {
        // Add 5 questions per test
        for (let q = 1; q <= 5; q++) {
            questionsToCreate.push({
                test_id: test.id,
                question_text: `Select the best synonym for the word "HAPPY" (Question ${q})`,
                correct_answer: "Joyful",
                options: ["Joyful", "Sad", "Angry", "Tired"],
                explanation: "Joyful is the closest synonym to Happy."
            });
        }
    }

    // Insert questions if table exists
    // For now we just log
    console.log(`Prepared ${questionsToCreate.length} questions (skipped insertion// pending searchema check).`);
    console.log('Seed complete!');
}

seedSynonymTests();
