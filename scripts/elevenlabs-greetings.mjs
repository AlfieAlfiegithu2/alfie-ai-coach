import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cuumxmfzhwljylbdlflj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI'
);

// CONFIG
const TOPIC_SLUG = 'greetings-introductions';
const ELEVEN_LABS_KEY = 'sk_221258ff2bac55b9332150570aa6bbd14c7fa17ea2eebf0d';
const BATCH_SIZE = 5;

async function run() {
    console.log(`🎤 Regenerating audio for: ${TOPIC_SLUG} using ELEVENLABS...`);

    // 1. Verify Topic Exists
    const { data: topic } = await supabase.from('dictation_topics').select('id').eq('slug', TOPIC_SLUG).single();
    if (!topic) {
        console.error('❌ Topic not found! Checking similar topics...');
        const { data: all } = await supabase.from('dictation_topics').select('slug').ilike('slug', '%greeting%');
        console.log('Found:', all?.map(t => t.slug));
        return;
    }

    // 2. Clear existing audio for this topic to force regeneration?
    // User said "regenerate", assuming we want to overwrite even if it exists or was partial.
    // Actually, the Edge Function updates row by row.

    console.log('🚀 Sending request to Edge Function...');

    const response = await fetch(
        'https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1/dictation-regenerate-audio',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI`
            },
            body: JSON.stringify({
                topicSlug: TOPIC_SLUG,
                limit: 20, // Do all 20 sentences for this topic
                provider: 'elevenlabs',
                elevenLabsKey: ELEVEN_LABS_KEY
            })
        }
    );

    const text = await response.text();
    console.log(`Response Status: ${response.status}`);

    try {
        const json = JSON.parse(text);
        console.log(JSON.stringify(json, null, 2));

        if (json.success) {
            console.log('\n✅ Successfully generated ElevenLabs audio!');
            console.log('Go check the page!');
        } else {
            console.log('\n❌ Failed:', json.error);
        }
    } catch (e) {
        console.log('Raw Response:', text);
    }
}

run();
