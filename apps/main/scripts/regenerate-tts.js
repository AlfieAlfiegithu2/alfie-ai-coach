// Direct TTS regeneration using elevenlabs-voice Edge Function (no user auth needed)
const D1_API_URL = 'https://alfie-translations-api.ryanbigbang15.workers.dev';
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg';

const WORDS = ['any', 'bloom', 'our'];

async function main() {
    console.log('🔄 Regenerating TTS for:', WORDS.join(', '));

    // Fetch cards from D1 in smaller batches
    console.log('📡 Fetching cards from D1...');
    let allCards = [];

    for (let offset = 0; offset < 8000; offset += 500) {
        try {
            const res = await fetch(`${D1_API_URL}/cards?limit=500&offset=${offset}`, {
                signal: AbortSignal.timeout(20000)
            });
            if (!res.ok) {
                console.log(`  Batch ${offset} failed (${res.status}), skipping...`);
                continue;
            }
            const data = await res.json();
            if (!data.data || data.data.length === 0) break;
            allCards = allCards.concat(data.data);

            // Check if we found both words
            const found = allCards.filter(c => WORDS.includes(c.term.toLowerCase()));
            if (found.length === WORDS.length) {
                console.log(`  ✓ Found all ${WORDS.length} words at offset ${offset}`);
                break;
            }
        } catch (e) {
            console.log(`  Error at offset ${offset}: ${e.message}`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log(`📊 Fetched ${allCards.length} cards total`);

    // Find matching cards
    const targetCards = allCards.filter(c => WORDS.includes(c.term.toLowerCase()));

    console.log('🔍 Search results:');
    WORDS.forEach(w => {
        const card = allCards.find(c => c.term.toLowerCase() === w.toLowerCase());
        console.log(`   ${w}: ${card ? `Found (${card.term}, audio: ${card.audio_url?.substring(0, 50) || 'none'}...)` : 'NOT FOUND'}`);
    });

    if (targetCards.length === 0) {
        console.log('❌ No matching cards found!');
        return;
    }

    // Use elevenlabs-voice function which doesn't require auth
    for (const card of targetCards) {
        console.log(`\n🎤 Regenerating "${card.term}"...`);

        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-voice`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SERVICE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: card.term,
                    voice_id: 'JBFqnCBsd6RMkjVDRZzb', // Rachel voice
                    skip_cache: true // Force regeneration
                })
            });

            const result = await response.json();

            if (result.audio_url || result.url) {
                const audioUrl = result.audio_url || result.url;
                console.log(`✅ Generated: ${audioUrl}`);

                // Update D1
                console.log(`📤 Syncing to D1...`);
                const syncRes = await fetch(`${D1_API_URL}/cards/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cards: [{ ...card, audio_url: audioUrl }] })
                });

                if (syncRes.ok) {
                    console.log(`✅ ${card.term} synced to D1!`);
                } else {
                    console.log(`⚠️ D1 sync failed: ${syncRes.status}`);
                }
            } else {
                console.log(`⚠️ No audio URL in response:`, JSON.stringify(result));
            }
        } catch (e) {
            console.error(`❌ Error: ${e.message}`);
        }
    }

    console.log('\n🏁 Done!');
}

main().catch(console.error);
