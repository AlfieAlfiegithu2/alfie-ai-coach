import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cuumxmfzhwljylbdlflj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI'
);

const TOPIC_SLUG = 'greetings-introductions';
const GEMINI_KEY = 'AIzaSyB4-7FitNOWZcPEDHcLyaJ4hQUlTWdKzyk';

async function finishTopic() {
    console.log(`🚀 Finishing topic: ${TOPIC_SLUG} using Gemini 2.5 PRO TTS...`);

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
                limit: 20, // Process everything in the topic
                provider: 'gemini',
                apiKey: GEMINI_KEY
            })
        }
    );

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    try {
        const json = JSON.parse(text);
        console.log(`Processed: ${json.processed}`);
        if (json.results) {
            const errors = json.results.filter(r => r.status === 'error');
            if (errors.length > 0) console.log(`Errors: ${errors.length}`);
        }
    } catch (e) {
        console.log('Output:', text);
    }
}

finishTopic();
