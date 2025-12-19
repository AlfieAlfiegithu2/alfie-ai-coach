import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Topics that need improvement (short content)
const topicsToImprove = [
    'adjectives-linking-verbs',
    'sentence-structure-svo',
    'word-order-time-place',
    'adjective-placement',
    'plural-nouns',
    'possessives-s-vs-of',
    'basic-questions-yes-no',
    'basic-questions-wh'
];

async function improveGrammarContent() {
    console.log('Starting grammar content improvement...\n');
    console.log('Topics to improve:', topicsToImprove.join(', '));
    console.log('\n');

    for (const topicSlug of topicsToImprove) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Processing: ${topicSlug}`);
        console.log('='.repeat(60));

        try {
            // Get topic ID
            const { data: topic, error: topicError } = await supabase
                .from('grammar_topics')
                .select('id, slug, level')
                .eq('slug', topicSlug)
                .single();

            if (topicError || !topic) {
                console.log(`❌ Topic not found: ${topicSlug}`);
                continue;
            }

            // Get lesson ID
            const { data: lesson, error: lessonError } = await supabase
                .from('grammar_lessons')
                .select('id')
                .eq('topic_id', topic.id)
                .single();

            if (lessonError || !lesson) {
                console.log(`❌ Lesson not found for topic: ${topicSlug}`);
                continue;
            }

            console.log(`📚 Found lesson ID: ${lesson.id}`);
            console.log(`🤖 Calling improve-grammar-lesson Edge Function...`);

            // Call the Edge Function
            const { data, error } = await supabase.functions.invoke('improve-grammar-lesson', {
                body: {
                    topic_slug: topicSlug,
                    lesson_id: lesson.id
                }
            });

            if (error) {
                console.log(`❌ Edge Function error:`, error);
                continue;
            }

            if (data.success) {
                console.log(`✅ Successfully improved! New content length: ${data.new_length} chars`);
            } else {
                console.log(`❌ Failed:`, data.error);
            }

        } catch (err) {
            console.log(`❌ Error processing ${topicSlug}:`, err.message);
        }

        // Rate limiting - wait 5 seconds between requests
        console.log('⏳ Waiting 5 seconds before next topic...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('\n\n✅ Grammar content improvement complete!');
}

improveGrammarContent();
