import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';
const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runBatch() {
    console.log('🚀 Starting IELTS Vocabulary TTS Generation Batch Loop...');

    let currentOffset = 0;
    const D1_LIMIT = 1000;

    while (true) {
        // 1. Fetch cards needing audio from D1
        console.log(`\n📡 Fetching batch from D1 (offset: ${currentOffset})...`);
        const d1Res = await fetch(`${D1_API_URL}/cards?limit=${D1_LIMIT}&offset=${currentOffset}`);
        const d1Data = await d1Res.json();
        const allCards = d1Data.data || [];

        if (allCards.length === 0) {
            console.log('✅ Reached the end of D1 database.');
            break;
        }

        const cardsNeedingAudio = allCards.filter(c => !c.audio_url).slice(0, 50);

        if (cardsNeedingAudio.length === 0) {
            console.log(`⏭️  No cards needing audio in this D1 batch (${currentOffset}-${currentOffset + D1_LIMIT}). Moving to next batch...`);
            currentOffset += D1_LIMIT;
            continue;
        }

        console.log(`🎯 Found ${cardsNeedingAudio.length} cards needing audio in current window.`);

        // 2. Insert into Supabase vocab_cards as a buffer
        console.log('📥 Injecting cards into Supabase buffer...');
        const { data: inserted, error: insertErr } = await supabase
            .from('vocab_cards')
            .upsert(cardsNeedingAudio.map(c => ({
                id: c.id,
                term: c.term,
                language: 'en',
                translation: '', // Fix for not-null constraint
                is_public: true,
                user_id: 'f59cee5f-07f3-452b-9540-a80f657d4630', // Real user ID
                level: c.level || 1,
                pos: c.pos,
                ipa: c.ipa,
                context_sentence: c.context_sentence,
                examples_json: c.examples_json
            })));

        if (insertErr) {
            console.error('❌ Failed to insert into Supabase:', insertErr);
            break;
        }

        // 3. Invoke vocab-batch-tts
        console.log(`🎤 Calling vocab-batch-tts edge function for ${cardsNeedingAudio.length} cards...`);
        const { data: ttsRes, error: ttsErr } = await supabase.functions.invoke('vocab-batch-tts', {
            body: { cardsPerRun: 50 }
        });

        if (ttsErr) {
            console.error('❌ Edge function error:', ttsErr);
            // Don't break, try to sync what we have
        } else {
            console.log('✅ Edge function results:', JSON.stringify(ttsRes.stats));
        }

        // 4. Fetch updated cards from Supabase
        console.log('📡 Fetching results from Supabase...');
        const { data: bufferCards, error: fetchErr } = await supabase
            .from('vocab_cards')
            .select('id, term, audio_url')
            .in('id', cardsNeedingAudio.map(c => c.id));

        if (fetchErr) {
            console.error('❌ Failed to fetch updated cards:', fetchErr);
        } else {
            const updatedCards = bufferCards.filter(c => c.audio_url);
            console.log(`📊 Buffer status: ${bufferCards.length} cards total, ${updatedCards.length} with audio.`);

            if (updatedCards.length > 0) {
                // 5. Sync back to D1
                console.log('📤 Syncing audio URLs back to D1...');
                const cardsToUpdate = cardsNeedingAudio.map(c => {
                    const updated = updatedCards.find(u => u.id === c.id);
                    if (updated) {
                        return { ...c, audio_url: updated.audio_url };
                    }
                    return null;
                }).filter(Boolean);

                const syncRes = await fetch(`${D1_API_URL}/cards/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cards: cardsToUpdate }),
                });

                if (syncRes.ok) {
                    console.log(`✅ Successfully synced ${cardsToUpdate.length} cards to D1.`);
                } else {
                    console.error('❌ Failed to sync to D1:', await syncRes.text());
                }
            }
        }

        // 6. Cleanup Supabase buffer
        console.log('🧹 Cleaning up Supabase buffer...');
        await supabase.from('vocab_cards').delete().in('id', cardsNeedingAudio.map(c => c.id));

        console.log('⏳ Waiting a bit before next turn...');
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('🏁 All batches complete!');
}

runBatch().catch(console.error);
