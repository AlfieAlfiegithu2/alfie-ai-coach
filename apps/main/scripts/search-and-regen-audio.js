/**
 * Search for ElevenLabs voices by name and regenerate dictation audio
 * 
 * This script:
 * 1. Searches for Bradford and Juniper voices in ElevenLabs library
 * 2. Uses the vocab-batch-tts Edge Function to generate audio
 * 3. Updates dictation_sentences with the new audio URLs
 * 
 * Usage: node search-and-regen-audio.js
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsamlseWJkbGZsaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMyNjE1OTU5LCJleHAiOjIwNDgxOTE5NTl9.l9efgCgsiYfgRzXvW-8n-gLPjR-8zsqvcnJKuLCIhk0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin user ID for temp cards
const ADMIN_USER_ID = 'f59cee5f-07f3-452b-9540-a80f657d4630';

// Helper to search for voice in shared voices (requires ElevenLabs to be called from Edge Function)
async function searchSharedVoices(searchTerm) {
    console.log(`🔍 Searching for voice: "${searchTerm}"...`);

    // Call a simple edge function to list voices
    // Since we can't search shared voices without auth from server
    // We'll use known voice IDs based on the ElevenLabs library

    // Known voice mappings from ElevenLabs Voice Library:
    const knownVoices = {
        // British accent voices
        'bradford': 'ZQe5CZNOzWyzPSCn5a3c', // Bradford - Expressive and Articulate (British)
        'george': 'JBFqnCBsd6RMkjVDRZzb',   // George - Warm, Captivating Storyteller (British)
        'alice': 'Xb7hH8MSUJpSbSDYk0k2',   // Alice - Clear, Engaging Educator (British)
        'daniel': 'onwK4e9ZLuTAKqWW03F9',  // Daniel - Steady Broadcaster (British)
        'lily': 'pFZP5JQG7iQjIQuC4Bku',    // Lily - Velvety Actress (British)

        // American accent voices
        'juniper': 'zrHiDhphv9ZnVXBqCLjz', // Juniper - Grounded and Professional (American)
        'sarah': 'EXAVITQu4vr4xnSDxMaL',   // Sarah - Mature, Reassuring, Confident (American)
        'brian': 'nPczCjzI2devNBz1zQrb',   // Brian - Deep, Resonant and Comforting (American)
        'jessica': 'cgSgspJ2msm6clMCkdW9', // Jessica - Playful, Bright, Warm (American)
        'chris': 'iP95p4xoKVk53GoZ742B',   // Chris - Charming, Down-to-Earth (American)
    };

    const searchLower = searchTerm.toLowerCase();
    if (knownVoices[searchLower]) {
        console.log(`✅ Found known voice: ${searchTerm} = ${knownVoices[searchLower]}`);
        return knownVoices[searchLower];
    }

    console.log(`⚠️ Voice "${searchTerm}" not found in known list`);
    return null;
}

async function generateAudioViaEdgeFunction(text, voiceId, label) {
    const tempId = crypto.randomUUID();

    console.log(`   📝 Creating temp card for ${label}...`);

    // Create a temporary vocab card
    const { error: insertError } = await supabase.from('vocab_cards').insert({
        id: tempId,
        term: text,
        language: 'en',
        is_public: true,
        user_id: ADMIN_USER_ID,
        translation: `TEMP_${label}_${Date.now()}`
    });

    if (insertError) {
        throw new Error(`Failed to create temp card: ${insertError.message}`);
    }

    try {
        console.log(`   🎤 Calling TTS with voice ${voiceId}...`);

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

        // Wait for the update to propagate
        await new Promise(r => setTimeout(r, 1000));

        // Fetch the generated audio URL from the temp card
        const { data: card, error: fetchError } = await supabase
            .from('vocab_cards')
            .select('audio_url')
            .eq('id', tempId)
            .single();

        if (fetchError || !card?.audio_url) {
            console.log('   ⚠️ Response:', JSON.stringify(data));
            throw new Error('Audio URL not found on temp card after generation');
        }

        console.log(`   ✅ ${label} audio: ${card.audio_url.substring(0, 60)}...`);
        return card.audio_url;
    } finally {
        // Always clean up the temp card
        await supabase.from('vocab_cards').delete().eq('id', tempId);
    }
}

async function regenerateForTopic(topicSlug, usVoiceName, ukVoiceName) {
    console.log('🔧 Dictation Audio Regenerator\n');
    console.log(`🎯 Topic: ${topicSlug}`);
    console.log(`🇺🇸 US Voice: ${usVoiceName}`);
    console.log(`🇬🇧 UK Voice: ${ukVoiceName}\n`);

    // Find voice IDs
    const usVoiceId = await searchSharedVoices(usVoiceName);
    const ukVoiceId = await searchSharedVoices(ukVoiceName);

    if (!usVoiceId || !ukVoiceId) {
        console.error('❌ Could not find required voices');
        return;
    }

    console.log(`\n🔑 Using voice IDs:`);
    console.log(`   US: ${usVoiceId}`);
    console.log(`   UK: ${ukVoiceId}\n`);

    // Get topic directly by slug
    const { data: topic, error: topicError } = await supabase
        .from('dictation_topics')
        .select('id, title')
        .eq('slug', topicSlug)
        .single();

    if (topicError || !topic) {
        console.error('❌ Topic not found:', topicError?.message);
        return;
    }

    console.log(`📖 Topic: ${topic.title}\n`);

    // Get sentences
    const { data: sentences, error: sentError } = await supabase
        .from('dictation_sentences')
        .select('id, sentence_text')
        .eq('topic_id', topic.id)
        .order('order_index');

    if (sentError || !sentences) {
        console.error('❌ Failed to fetch sentences:', sentError?.message);
        return;
    }

    console.log(`📝 Found ${sentences.length} sentences\n`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    let processed = 0;
    let errors = 0;

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const shortText = sentence.sentence_text.length > 40
            ? sentence.sentence_text.substring(0, 40) + '...'
            : sentence.sentence_text;

        console.log(`\n[${i + 1}/${sentences.length}] "${shortText}"`);

        try {
            // Generate US audio
            const usUrl = await generateAudioViaEdgeFunction(sentence.sentence_text, usVoiceId, 'US');

            // Rate limiting
            await new Promise(r => setTimeout(r, 1500));

            // Generate UK audio
            const ukUrl = await generateAudioViaEdgeFunction(sentence.sentence_text, ukVoiceId, 'UK');

            // Update database
            const { error: updateError } = await supabase
                .from('dictation_sentences')
                .update({
                    audio_url_us: usUrl,
                    audio_url_uk: ukUrl
                })
                .eq('id', sentence.id);

            if (updateError) {
                console.error(`   ❌ Database update failed:`, updateError.message);
                errors++;
            } else {
                console.log(`   ✅ Database updated`);
                processed++;
            }

            // Rate limiting between sentences
            await new Promise(r => setTimeout(r, 2000));

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            errors++;
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Complete! Processed: ${processed}, Errors: ${errors}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// Run with Bradford (UK) and Juniper (US) for numbers-counting
regenerateForTopic('numbers-counting', 'juniper', 'bradford').catch(console.error);
