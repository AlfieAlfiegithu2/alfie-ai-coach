import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cuumxmfzhwljylbdlflj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI'
);

const BATCH_SIZE = 5;  // Smaller batch to avoid timeouts
const DELAY_BETWEEN_BATCHES = 10000;  // 10 seconds between batches
const MAX_BATCHES = 50;  // Process 50 batches max per run (250 sentences)

async function triggerAudioGeneration() {
    console.log('🎵 Starting Dictation Audio Generation (Conservative Mode)...\n');

    // Get topics with pending sentences
    const { data: sentences } = await supabase
        .from('dictation_sentences')
        .select('id, topic_id, audio_url_us, audio_url_uk');

    const pending = sentences.filter(s => !s.audio_url_us || !s.audio_url_uk || s.audio_url_us === s.audio_url_uk);
    console.log(`📊 ${pending.length} sentences need audio\n`);

    if (pending.length === 0) {
        console.log('✅ All audio already generated!');
        return;
    }

    // Get unique topic IDs with pending
    const topicIds = [...new Set(pending.map(s => s.topic_id))];

    // Get topic slugs
    const { data: topics } = await supabase
        .from('dictation_topics')
        .select('id, slug')
        .in('id', topicIds);

    const topicMap = Object.fromEntries(topics.map(t => [t.id, t.slug]));

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let batchCount = 0;

    // Process one topic at a time, in small batches
    for (const topicId of topicIds) {
        if (batchCount >= MAX_BATCHES) {
            console.log(`\n⏸️ Reached max batches (${MAX_BATCHES}). Run again for more.`);
            break;
        }

        const slug = topicMap[topicId];
        const topicPending = pending.filter(s => s.topic_id === topicId);

        console.log(`\n🎤 Topic: ${slug} (${topicPending.length} pending)`);

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
                        limit: BATCH_SIZE
                    })
                }
            );

            if (!response.ok) {
                console.log(`   ❌ HTTP Error: ${response.status}`);
                totalErrors++;
                continue;
            }

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch {
                console.log(`   ❌ Invalid JSON response`);
                totalErrors++;
                continue;
            }

            if (result.success) {
                const successes = result.results?.filter(r => r.status === 'success').length || 0;
                const errors = result.results?.filter(r => r.status === 'error').length || 0;

                totalProcessed += result.processed || 0;
                totalSuccess += successes;
                totalErrors += errors;

                console.log(`   ✅ ${successes} success, ${errors} errors`);

                if (errors > 0 && result.results) {
                    const firstError = result.results.find(r => r.status === 'error');
                    if (firstError) {
                        console.log(`   ⚠️ Sample error: ${firstError.error?.substring(0, 60)}`);
                    }
                }
            } else {
                console.log(`   ❌ ${result.error}`);
                totalErrors++;
            }

            batchCount++;

            // Delay between batches
            if (batchCount < MAX_BATCHES) {
                console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s...`);
                await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
            }

        } catch (e) {
            console.log(`   ❌ Request failed: ${e.message}`);
            totalErrors++;
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 BATCH COMPLETE');
    console.log(`   Batches Run: ${batchCount}`);
    console.log(`   Total Sentences Processed: ${totalProcessed}`);
    console.log(`   Success: ${totalSuccess}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Final status check
    const { data: finalData } = await supabase.from('dictation_sentences').select('id, audio_url_us, audio_url_uk');
    const finalPending = finalData.filter(s => !s.audio_url_us || !s.audio_url_uk || s.audio_url_us === s.audio_url_uk).length;
    console.log(`\n📉 Overall Progress: ${finalData.length - finalPending}/${finalData.length} (${(((finalData.length - finalPending) / finalData.length) * 100).toFixed(1)}%)`);
}

triggerAudioGeneration();
