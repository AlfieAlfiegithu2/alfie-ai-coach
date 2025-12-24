
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY are required env variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Voice Pools - Use verified ElevenLabs voices with distinct accents
// American accent voices (verified from ElevenLabs API)
const US_VOICES = [
    'EXAVITQu4vr4xnSDxMaL', // Sarah - Mature, Reassuring, Confident (American Female)
    'nPczCjzI2devNBz1zQrb', // Brian - Deep, Resonant and Comforting (American Male)
    'iP95p4xoKVk53GoZ742B', // Chris - Charming, Down-to-Earth (American Male)
];

// British accent voices (verified from ElevenLabs API)
const UK_VOICES = [
    'JBFqnCBsd6RMkjVDRZzb', // George - Warm, Captivating Storyteller (British Male)
    'Xb7hH8MSUJpSbSDYk0k2', // Alice - Clear, Engaging Educator (British Female)
    'onwK4e9ZLuTAKqWW03F9', // Daniel - Steady Broadcaster (British Male)
];

function getRandomVoice(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

async function batchTTS() {
    console.log('🎧 Dictation TTS Generator (Continuous Loop)\n');

    let totalProcessed = 0;

    while (true) {
        // 1. Fetch sentences
        const { data: sentences, error: fetchError } = await supabase
            .from('dictation_sentences')
            .select('id, sentence_text, audio_url_us, audio_url_uk')
            .or('audio_url_us.is.null,audio_url_uk.is.null')
            .limit(20);

        if (fetchError) {
            console.error('❌ Failed to fetch sentences:', fetchError.message);
            // Wait a bit before retrying on error
            await new Promise(r => setTimeout(r, 5000));
            continue;
        }

        // Filter: Missing audio OR duplicate audio URLs
        const sentencesToProcess = sentences.filter(s =>
            !s.audio_url_us ||
            !s.audio_url_uk ||
            (s.audio_url_us === s.audio_url_uk)
        );

        if (sentencesToProcess.length === 0) {
            console.log('✅ No more sentences need audio update.');
            break;
        }

        console.log(`\n🎯 Processing batch of ${sentencesToProcess.length} sentences (Total processed: ${totalProcessed})...`);

        for (const sentence of sentencesToProcess) {
            console.log(`\n📝 Sentence: "${sentence.sentence_text.substring(0, 50)}..."`);

            let audioUrlUS = sentence.audio_url_us;
            let audioUrlUK = sentence.audio_url_uk;

            const areIdentical = (audioUrlUS && audioUrlUK && audioUrlUS === audioUrlUK);
            const needsUS = !audioUrlUS || areIdentical;
            const needsUK = !audioUrlUK || areIdentical;

            // --- Generate US Audio ---
            if (needsUS) {
                const tempIdUS = crypto.randomUUID();
                await supabase.from('vocab_cards').insert({
                    id: tempIdUS,
                    term: sentence.sentence_text,
                    language: 'en',
                    is_public: true,
                    user_id: 'f59cee5f-07f3-452b-9540-a80f657d4630',
                    translation: 'TEMP_US'
                });

                try {
                    const voice = getRandomVoice(US_VOICES);
                    console.log(`   🎤 Generating US Audio (Voice: ${voice})...`);

                    const { error: usError } = await supabase.functions.invoke('vocab-batch-tts', {
                        body: { voice: voice, forceRegenerate: [sentence.sentence_text] }
                    });

                    if (usError) throw new Error(`US Edge Function Error: ${usError.message}`);

                    const { data: card } = await supabase.from('vocab_cards').select('audio_url').eq('id', tempIdUS).single();

                    if (card?.audio_url) {
                        audioUrlUS = card.audio_url;
                    } else {
                        throw new Error('US Audio URL not found on temp card after generation');
                    }
                } catch (e) {
                    console.error('   ❌ US Gen Failed:', e.message);
                } finally {
                    await supabase.from('vocab_cards').delete().eq('id', tempIdUS);
                }
            }

            // --- Generate UK Audio ---
            if (needsUK) {
                const tempIdUK = crypto.randomUUID();
                await supabase.from('vocab_cards').insert({
                    id: tempIdUK,
                    term: sentence.sentence_text,
                    language: 'en',
                    is_public: true,
                    user_id: 'f59cee5f-07f3-452b-9540-a80f657d4630',
                    translation: 'TEMP_UK'
                });

                try {
                    const voice = getRandomVoice(UK_VOICES);
                    console.log(`   🎤 Generating UK Audio (Voice: ${voice})...`);

                    const { error: ukError } = await supabase.functions.invoke('vocab-batch-tts', {
                        body: { voice: voice, forceRegenerate: [sentence.sentence_text] }
                    });

                    if (ukError) throw new Error(`UK Edge Function Error: ${ukError.message}`);

                    const { data: card } = await supabase.from('vocab_cards').select('audio_url').eq('id', tempIdUK).single();

                    if (card?.audio_url) {
                        audioUrlUK = card.audio_url;
                    } else {
                        throw new Error('UK Audio URL not found on temp card after generation');
                    }
                } catch (e) {
                    console.error('   ❌ UK Gen Failed:', e.message);
                } finally {
                    await supabase.from('vocab_cards').delete().eq('id', tempIdUK);
                }
            }

            // Update if we have distinct URLs
            if (audioUrlUS && audioUrlUK && audioUrlUS !== audioUrlUK) {
                const { error: updateError } = await supabase
                    .from('dictation_sentences')
                    .update({ audio_url_us: audioUrlUS, audio_url_uk: audioUrlUK })
                    .eq('id', sentence.id);

                if (updateError) console.error('   ❌ Save Failed:', updateError.message);
                else {
                    console.log('   ✅ Saved distinct audios.');
                    totalProcessed++;
                }
            } else {
                if (audioUrlUS === audioUrlUK) {
                    console.warn('   ⚠️ Skipping save: Gen produced identical URLs.');
                } else {
                    console.warn('   ⚠️ Skipping save: One or both audios failed.');
                }
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }

        // Rate limiting between batches
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n🏁 Continuous batch processing complete!');
}

batchTTS().catch(console.error);
