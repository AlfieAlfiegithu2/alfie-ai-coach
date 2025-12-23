import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('🔍 Identifying topics with low exercise counts...');

    // 1. Get all topics
    const { data: topics } = await supabase.from('grammar_topics').select('id, slug');

    // 2. Count exercises for each
    const { data: counts } = await supabase.rpc('get_topic_exercise_counts'); // If this RPC exists, else manual

    // Manual counting if RPC missing
    const lowCountTopics = [];
    for (const topic of topics) {
        const { count } = await supabase
            .from('grammar_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('topic_id', topic.id);

        if (count < 10) {
            lowCountTopics.push({ ...topic, exerciseCount: count });
        }
    }

    console.log(`Found ${lowCountTopics.length} topics with < 10 exercises.`);

    for (const topic of lowCountTopics) {
        console.log(`\n🚀 Generating exercises for: ${topic.slug} (Current: ${topic.exerciseCount})`);
        try {
            const { data, error } = await supabase.functions.invoke('generate-grammar-exercises', {
                body: {
                    topic_id: topic.id,
                    language_code: 'en',
                    language_name: 'English',
                    count: 10
                }
            });
            if (error) throw error;
            console.log(`    ✅ Generated ${data.count} new exercises.`);

            // Short delay to avoid rate limits
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error(`    ❌ Failed for ${topic.slug}:`, e.message);
        }
    }

    console.log('\n✨ All missing exercises generated!');
}

run().catch(console.error);
