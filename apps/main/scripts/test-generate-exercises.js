
import { createClient } from '@supabase/supabase-js';

// Configuration
// Using the same hardcoded key from the original file for now, assuming it works or env var is present
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LANGUAGES = [
    { code: 'en', name: 'English' },
    // Only test with one other language to save time
    { code: 'es', name: 'Spanish' }
];

async function generateExercisesForTopic(topic, language) {
    console.log(`  - [${language.code}] Generating/Updating exercises...`);

    // Retry logic
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const { data, error } = await supabase.functions.invoke('generate-grammar-exercises', {
                body: {
                    lesson_id: topic.id,
                    topic_id: topic.id,
                    topic_title: topic.slug,
                    language_code: language.code,
                    language_name: language.name
                }
            });

            if (error) throw error;
            console.log(`    ✅ Success! Count: ${data.count}`);
            return true;
        } catch (e) {
            console.error(`    ⚠️  Attempt ${attempt}/3 failed: ${e.message}`);
            if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.error(`    ❌ Failed after 3 attempts.`);
    return false;
}

async function runBatch() {
    console.log('🚀 Starting Single Topic Test Grammar Exercises Generation...');

    // 1. Fetch one grammar topic (e.g., 'present-simple')
    const { data: topics, error } = await supabase
        .from('grammar_topics')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching topics:', error);
        return;
    }

    if (!topics.length) {
        console.log('No topics found.');
        return;
    }

    const topic = topics[0];
    console.log(`\nProcessing Topic: ${topic.slug} (${topic.id})`);

    // Always run English first
    await generateExercisesForTopic(topic, { code: 'en', name: 'English' });

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // Generate for other languages
    for (const lang of LANGUAGES) {
        if (lang.code === 'en') continue;
        await generateExercisesForTopic(topic, lang);
    }
}

runBatch();
