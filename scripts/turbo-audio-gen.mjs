import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cuumxmfzhwljylbdlflj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI'
);

// FAST MODE CONFIG
const BATCH_SIZE = 3;           // Smaller batches to avoid function timeouts
const DELAY_BETWEEN_BATCHES = 500; // Fast cycle
const DELAY_ON_RATE_LIMIT = 5000;   // 5 seconds if we hit a snag
const GEMINI_KEY = 'AIzaSyB4-7FitNOWZcPEDHcLyaJ4hQUlTWdKzyk'; // Using your provided key

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function getStatus() {
    const { data } = await supabase.from('dictation_sentences').select('id, audio_url_us, audio_url_uk');
    const pending = data.filter(s => !s.audio_url_us || !s.audio_url_uk || s.audio_url_us === s.audio_url_uk);
    return { total: data.length, pending: pending.length, complete: data.length - pending.length };
}

async function processTopicBatch(slug, limit) {
    try {
        const response = await fetch(
            'https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1/dictation-regenerate-audio',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI`
                },
                // We pass the API Key here!
                body: JSON.stringify({
                    topicSlug: slug,
                    limit,
                    apiKey: GEMINI_KEY
                })
            }
        );

        if (!response.ok) {
            console.log(`   ❌ HTTP Error: ${response.status} - ${await response.text()}`);
            return { success: 0, errors: 1, rateLimited: response.status === 429 };
        }

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch {
            return { success: 0, errors: limit, rateLimited: false };
        }

        if (result.success && result.results) {
            const successes = result.results.filter(r => r.status === 'success').length;
            const errors = result.results.filter(r => r.status === 'error').length;
            const rateLimited = result.results.some(r => r.error?.includes('429'));

            if (errors > 0 && result.results[0].error) {
                console.log('   ⚠️ Error details:', result.results[0].error);
            }

            return { success: successes, errors, rateLimited };
        }

        return { success: 0, errors: 0, rateLimited: result.error?.includes('429') };
    } catch (e) {
        console.log(`   ❌ Fetch Error: ${e.message}`);
        return { success: 0, errors: 1, rateLimited: false };
    }
}

async function runTurboGeneration() {
    console.log('🚀 TURBO AUDIO GENERATION STARTED (Using Paid Key)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Started at: ${new Date().toLocaleString()}`);

    let totalSuccess = 0;
    let totalErrors = 0;
    let rateLimitHits = 0;

    while (true) {
        const status = await getStatus();
        console.log(`\n📊 [${new Date().toLocaleTimeString()}] Progress: ${status.complete}/${status.total} (${((status.complete / status.total) * 100).toFixed(1)}%) | Pending: ${status.pending}`);

        if (status.pending === 0) {
            console.log('\n✅ ALL AUDIO GENERATION COMPLETE!');
            break;
        }

        // Get topics
        const { data: sentences } = await supabase
            .from('dictation_sentences')
            .select('id, topic_id, audio_url_us, audio_url_uk');

        const pending = sentences.filter(s => !s.audio_url_us || !s.audio_url_uk || s.audio_url_us === s.audio_url_uk);
        if (pending.length === 0) break;

        const topicIds = [...new Set(pending.map(s => s.topic_id))];

        // Process multiple topics in "parallel" locally (sequential but fast)
        // We'll take the first 3 topics and process them
        const currentTopicIds = topicIds.slice(0, 1);

        // Get slugs
        const { data: topics } = await supabase.from('dictation_topics').select('id, slug').in('id', currentTopicIds);

        for (const topic of topics) {
            console.log(`⚡ Processing batch for: ${topic.slug}`);
            const result = await processTopicBatch(topic.slug, BATCH_SIZE);

            totalSuccess += result.success;
            totalErrors += result.errors;

            console.log(`   ✅ ${result.success} generated`);

            if (result.errors > 0) console.log(`   ⚠️ ${result.errors} errors`);

            if (result.rateLimited) {
                rateLimitHits++;
                console.log(`   🛑 Rate limited! Waiting 5s...`);
                await sleep(DELAY_ON_RATE_LIMIT);
            } else {
                // Very short delay
                await sleep(DELAY_BETWEEN_BATCHES);
            }
        }
    }
}

runTurboGeneration();
