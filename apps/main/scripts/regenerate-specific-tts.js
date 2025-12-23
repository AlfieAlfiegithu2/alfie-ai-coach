// Regenerate TTS for specific words using vocab-batch-tts edge function
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';
const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Words to regenerate
const WORDS_TO_REGENERATE = ['any', 'bloom', 'our'];

async function regenerateSpecificWords() {
    console.log('🔄 Regenerating TTS for:', WORDS_TO_REGENERATE.join(', '));

    // 1. Fetch all cards from D1 (search through batches)
    console.log('📡 Searching for cards in D1...');
    let allTargetCards = [];

    for (let offset = 0; offset < 10000; offset += 500) {
        try {
            const res = await fetch(`${D1_API_URL}/cards?limit=500&offset=${offset}`, {
                signal: AbortSignal.timeout(20000)
            });
            if (!res.ok) continue;
            const data = await res.json();
            if (!data.data || data.data.length === 0) break;

            // Find matching cards in this batch
            const matches = data.data.filter(c =>
                WORDS_TO_REGENERATE.some(w => w.toLowerCase() === c.term.toLowerCase())
            );
            allTargetCards = allTargetCards.concat(matches);

            // Check if we found all words
            if (allTargetCards.length >= WORDS_TO_REGENERATE.length) {
                console.log(`  ✓ Found all ${WORDS_TO_REGENERATE.length} words`);
                break;
            }
        } catch (e) {
            console.log(`  Error at offset ${offset}: ${e.message}`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log(`📊 Found ${allTargetCards.length} matching cards:`);
    allTargetCards.forEach(c => console.log(`   - ${c.term} (current audio: ${c.audio_url ? 'yes' : 'none'})`));

    if (allTargetCards.length === 0) {
        console.log('❌ No matching cards found!');
        return;
    }

    // 2. Clear audio_url from these cards and insert into Supabase buffer
    console.log('📥 Inserting cards into Supabase buffer (without audio)...');
    const cardsForBuffer = allTargetCards.map(c => ({
        id: c.id,
        term: c.term,
        language: 'en',
        translation: c.translation || '',
        is_public: true,
        user_id: 'f59cee5f-07f3-452b-9540-a80f657d4630',
        level: c.level || 1,
        pos: c.pos,
        ipa: c.ipa,
        context_sentence: c.context_sentence,
        examples_json: c.examples_json,
        audio_url: null // Force regeneration
    }));

    const { error: insertErr } = await supabase
        .from('vocab_cards')
        .upsert(cardsForBuffer);

    if (insertErr) {
        console.error('❌ Failed to insert into Supabase:', insertErr);
        return;
    }

    // 3. Call vocab-batch-tts edge function
    console.log('🎤 Calling vocab-batch-tts edge function...');
    const { data: ttsRes, error: ttsErr } = await supabase.functions.invoke('vocab-batch-tts', {
        body: { cardsPerRun: 50 }
    });

    if (ttsErr) {
        console.error('❌ Edge function error:', ttsErr);
    } else {
        console.log('✅ Edge function results:', JSON.stringify(ttsRes?.stats || ttsRes));
    }

    // 4. Fetch updated cards from Supabase
    console.log('📡 Fetching results from Supabase...');
    const { data: updatedCards, error: fetchErr } = await supabase
        .from('vocab_cards')
        .select('id, term, audio_url')
        .in('id', allTargetCards.map(c => c.id));

    if (fetchErr) {
        console.error('❌ Failed to fetch updated cards:', fetchErr);
        return;
    }

    console.log('📊 Updated cards:');
    updatedCards.forEach(c => console.log(`   - ${c.term}: ${c.audio_url || 'no audio'}`));

    const cardsWithAudio = updatedCards.filter(c => c.audio_url);

    if (cardsWithAudio.length > 0) {
        // 5. Sync back to D1
        console.log('📤 Syncing audio URLs back to D1...');
        const cardsToUpdate = allTargetCards.map(c => {
            const updated = cardsWithAudio.find(u => u.id === c.id);
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

    // 6. Cleanup Supabase buffer
    console.log('🧹 Cleaning up Supabase buffer...');
    await supabase.from('vocab_cards').delete().in('id', allTargetCards.map(c => c.id));

    console.log('🏁 Done!');
}

regenerateSpecificWords().catch(console.error);
