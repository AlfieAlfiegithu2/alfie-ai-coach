/**
 * Fix Dictation Audio Accents
 * 
 * This script regenerates audio for dictation sentences using the existing
 * vocab-batch-tts Edge Function but with specific and distinct voice IDs.
 * 
 * It creates temporary vocab_cards, generates TTS, extracts the URL, 
 * then stores the audio URL back on the dictation_sentences table.
 * 
 * Usage: SUPABASE_URL=... SUPABASE_KEY=... node fix-dictation-accents.js [topic-slug]
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_KEY is required. Set it as an environment variable.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Voice configuration - CLEARLY DISTINCT accents from current ElevenLabs library
// American: Sarah - Mature female with clear American accent
const US_VOICE = 'EXAVITQu4vr4xnSDxMaL';

// British: Alice - Clear British female educator voice
const UK_VOICE = 'Xb7hH8MSUJpSbSDYk0k2';

// Admin user ID for creating temp cards
const ADMIN_USER_ID = 'f59cee5f-07f3-452b-9540-a80f657d4630';

async function generateAudioViaEdgeFunction(text, voiceId, label) {
    const tempId = crypto.randomUUID();

    // Create a temporary vocab card
    const { error: insertError } = await supabase.from('vocab_cards').insert({
        id: tempId,
        term: text,
        language: 'en',
        is_public: true,
        user_id: ADMIN_USER_ID,
        translation: `TEMP_${label}`
    });

    if (insertError) {
        throw new Error(`Failed to create temp card: ${insertError.message}`);
    }

    try {
        // Call the Edge Function to generate TTS
        const { data, error: funcError } = await supabase.functions.invoke('vocab-batch-tts', {
            body: {
                voice: voiceId,
                forceRegenerate: [text],
                cardsPerRun: 1
            }
        });

        if (funcError) {
            throw new Error(`Edge Function error: ${funcError.message}`);
        }

        // Wait a moment for the update to propagate
        await new Promise(r => setTimeout(r, 500));

        // Fetch the generated audio URL from the temp card
        const { data: card, error: fetchError } = await supabase
            .from('vocab_cards')
            .select('audio_url')
            .eq('id', tempId)
            .single();

        if (fetchError || !card?.audio_url) {
            throw new Error('Audio URL not found on temp card after generation');
        }

        return card.audio_url;
    } finally {
        // Always clean up the temp card
        await supabase.from('vocab_cards').delete().eq('id', tempId);
    }
}

async function fixAccents(topicSlug) {
    console.log('🔧 Dictation Audio Accent Fixer\n');
    console.log(`🇺🇸 US Voice: Sarah (${US_VOICE})`);
    console.log(`🇬🇧 UK Voice: Alice (${UK_VOICE})\n`);

    // Get topic
    let topicQuery = supabase.from('dictation_topics').select('id, title, slug');

    if (topicSlug && topicSlug !== 'all') {
        topicQuery = topicQuery.eq('slug', topicSlug);
    }

    const { data: topics, error: topicError } = await topicQuery;

    if (topicError) {
        console.error('❌ Failed to fetch topics:', topicError.message);
        return;
    }

    if (!topics || topics.length === 0) {
        console.log('No topics found');
        return;
    }

    console.log(`📚 Found ${topics.length} topic(s) to process\n`);

    let totalProcessed = 0;
    let totalErrors = 0;

    for (const topic of topics) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📖 Topic: ${topic.title} (${topic.slug})`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // Get sentences for this topic
        const { data: sentences, error: sentencesError } = await supabase
            .from('dictation_sentences')
            .select('id, sentence_text, audio_url_us, audio_url_uk')
            .eq('topic_id', topic.id)
            .order('order_index');

        if (sentencesError) {
            console.error('❌ Failed to fetch sentences:', sentencesError.message);
            continue;
        }

        console.log(`Found ${sentences.length} sentences\n`);

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const shortText = sentence.sentence_text.length > 40
                ? sentence.sentence_text.substring(0, 40) + '...'
                : sentence.sentence_text;
            console.log(`\n[${i + 1}/${sentences.length}] "${shortText}"`);

            try {
                // Generate US audio with Sarah's voice
                console.log('   🇺🇸 Generating US audio (Sarah)...');
                const usUrl = await generateAudioViaEdgeFunction(sentence.sentence_text, US_VOICE, 'US');
                console.log(`   ✅ US: ${usUrl.substring(0, 60)}...`);

                // Rate limiting
                await new Promise(r => setTimeout(r, 1500));

                // Generate UK audio with Alice's voice
                console.log('   🇬🇧 Generating UK audio (Alice)...');
                const ukUrl = await generateAudioViaEdgeFunction(sentence.sentence_text, UK_VOICE, 'UK');
                console.log(`   ✅ UK: ${ukUrl.substring(0, 60)}...`);

                // Verify URLs are different
                if (usUrl === ukUrl) {
                    console.warn('   ⚠️ WARNING: US and UK URLs are identical!');
                }

                // Update the dictation_sentences table
                const { error: updateError } = await supabase
                    .from('dictation_sentences')
                    .update({
                        audio_url_us: usUrl,
                        audio_url_uk: ukUrl
                    })
                    .eq('id', sentence.id);

                if (updateError) {
                    console.error(`   ❌ Failed to update database:`, updateError.message);
                    totalErrors++;
                } else {
                    console.log(`   ✅ Database updated`);
                    totalProcessed++;
                }

                // Rate limiting between sentences
                await new Promise(r => setTimeout(r, 2000));

            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
                totalErrors++;
            }
        }
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏁 Audio regeneration complete!');
    console.log(`   ✅ Processed: ${totalProcessed}`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Get topic slug from command line args
const topicSlug = process.argv[2] || 'numbers-counting';
console.log(`\n🎯 Target topic: ${topicSlug}\n`);

fixAccents(topicSlug).catch(console.error);
