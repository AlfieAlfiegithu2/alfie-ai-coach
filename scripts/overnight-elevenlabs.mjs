import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cuumxmfzhwljylbdlflj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI'
);

// ELEVENLABS CONFIG
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES = 2000;   // 2 seconds
const DELAY_ON_ERROR = 10000;          // 10 seconds on error
const ELEVEN_LABS_KEY = 'sk_221258ff2bac55b9332150570aa6bbd14c7fa17ea2eebf0d';

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
                body: JSON.stringify({
                    topicSlug: slug,
                    limit,
                    provider: 'elevenlabs',
                    elevenLabsKey: ELEVEN_LABS_KEY
                })
            }
        );

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch {
            return { success: 0, errors: limit, errorMsg: 'Invalid JSON' };
        }

        if (result.success && result.results) {
            const successes = result.results.filter(r => r.status === 'success').length;
            const errors = result.results.filter(r => r.status === 'error').length;
            const firstError = result.results.find(r => r.status === 'error');
            return { success: successes, errors, errorMsg: firstError?.error };
        }

        return { success: 0, errors: 0, errorMsg: result.error };
    } catch (e) {
        return { success: 0, errors: 1, errorMsg: e.message };
    }
}

async function runGeneration() {
    console.log('🎤 ELEVENLABS AUDIO GENERATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Started at: ${new Date().toLocaleString()}`);
    console.log('Voices: Random (US: Antoni/Josh/Bella/Domi, UK: George/Roger/Alice)\n');

    let totalSuccess = 0;
    let totalErrors = 0;

    while (true) {
        const status = await getStatus();
        console.log(`\n📊 [${new Date().toLocaleTimeString()}] Progress: ${status.complete}/${status.total} (${((status.complete / status.total) * 100).toFixed(1)}%)`);

        if (status.pending === 0) {
            console.log('\n✅ ALL AUDIO GENERATION COMPLETE!');
            break;
        }

        // Get topics with pending
        const { data: sentences } = await supabase
            .from('dictation_sentences')
            .select('id, topic_id, audio_url_us, audio_url_uk');

        const pending = sentences.filter(s => !s.audio_url_us || !s.audio_url_uk || s.audio_url_us === s.audio_url_uk);
        if (pending.length === 0) break;

        const topicIds = [...new Set(pending.map(s => s.topic_id))];
        const { data: topics } = await supabase.from('dictation_topics').select('id, slug').in('id', topicIds);

        if (topics.length > 0) {
            const topic = topics[0];
            console.log(`⚡ Processing: ${topic.slug}`);

            const result = await processTopicBatch(topic.slug, BATCH_SIZE);
            totalSuccess += result.success;
            totalErrors += result.errors;

            if (result.success > 0) {
                console.log(`   ✅ ${result.success} generated`);
            }

            if (result.errors > 0) {
                console.log(`   ⚠️ ${result.errors} errors`);
                if (result.errorMsg) {
                    console.log(`   Error: ${result.errorMsg.substring(0, 80)}`);
                }
                await sleep(DELAY_ON_ERROR);
            } else {
                await sleep(DELAY_BETWEEN_BATCHES);
            }
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏁 GENERATION COMPLETE');
    console.log(`   Success: ${totalSuccess}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Finished at: ${new Date().toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

runGeneration();
