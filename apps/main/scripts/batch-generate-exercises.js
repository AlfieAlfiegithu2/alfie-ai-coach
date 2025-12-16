
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'bn', name: 'Bengali' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'ko', name: 'Korean' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'it', name: 'Italian' },
    { code: 'tr', name: 'Turkish' },
    { code: 'th', name: 'Thai' },
    { code: 'pl', name: 'Polish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'id', name: 'Indonesian' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'ms', name: 'Malay' },
    { code: 'fa', name: 'Persian' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'ro', name: 'Romanian' },
    { code: 'el', name: 'Greek' },
    { code: 'cs', name: 'Czech' },
    { code: 'sv', name: 'Swedish' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'he', name: 'Hebrew' },
];

async function generateExercisesForTopic(topic, language) {
    console.log(`  - [${language.code}] Generating/Updating exercises...`);

    // Retry logic
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const { data, error } = await supabase.functions.invoke('generate-grammar-exercises', {
                body: {
                    lesson_id: topic.id, // Using topic.id as lesson_id for consistency in logging, but technically we use topic_id
                    topic_id: topic.id,
                    topic_title: topic.slug, // Or fetch title
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
    console.log('🚀 Starting Batch Grammar Exercises Generation...');

    // 1. Fetch all grammar topics
    const { data: topics, error } = await supabase
        .from('grammar_topics')
        .select('*');

    if (error) {
        console.error('Error fetching topics:', error);
        return;
    }

    console.log(`📚 Found ${topics.length} topics.`);

    for (const topic of topics) {
        console.log(`\nProcessing Topic: ${topic.slug} (${topic.id})`);

        // 2. Ensure English Exercises Exist FIRST (Critical)
        // Check if 20 english exercises exist
        /*
        const { count } = await supabase
            .from('grammar_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id);
            
        // Actually, let's force regenerate English if count < 20 to fulfill request
        // Or user just said "Make 20".
        */

        // Always run English first to ensure base is correct/refreshed
        await generateExercisesForTopic(topic, { code: 'en', name: 'English' });

        // Wait a bit
        await new Promise(r => setTimeout(r, 1000));

        // 3. Generate for other languages
        for (const lang of LANGUAGES) {
            if (lang.code === 'en') continue; // Already done

            // Check if translations exist? 
            // Optimally we'd skip if already done, but "Make 20" implies we might need to update.
            // Let's assume we proceed.
            await generateExercisesForTopic(topic, lang);

            // Delay for rate limits
            await new Promise(r => setTimeout(r, 1500)); // 1.5s delay
        }
    }
}

runBatch();
