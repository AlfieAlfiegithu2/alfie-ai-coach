/**
 * Regenerate Dictation Audio with Distinct US/UK Accents
 * 
 * This script regenerates audio for dictation sentences using clearly distinct
 * American and British English voices from ElevenLabs.
 * 
 * Usage: SUPABASE_URL=... SUPABASE_KEY=... ELEVENLABS_API_KEY=... node regenerate-dictation-audio.js [topic-slug]
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { createHmac, createHash } from 'node:crypto';
import https from 'node:https';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'alfie-ai-audio';
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY are required env variables.');
    process.exit(1);
}

if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY is required for TTS generation.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Voice configuration - CLEARLY DISTINCT accents
// American: Sarah (female, confident American accent)
const US_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Mature, Reassuring, Confident (American)

// British: Alice (female, clear British accent) 
const UK_VOICE = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice - Clear, Engaging Educator (British)

// AWS Signature V4 helpers for R2 upload
function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(regionName).digest();
    const kService = createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
}

function sha256(data) {
    const hash = createHash('sha256');
    hash.update(typeof data === 'string' ? Buffer.from(data) : Buffer.from(data));
    return hash.digest('hex');
}

// Upload audio to R2
async function uploadToR2(audioBuffer, path) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        throw new Error('Missing Cloudflare R2 configuration');
    }

    const accessKeyId = R2_ACCESS_KEY_ID.length === 64 ? R2_ACCESS_KEY_ID.slice(0, 32) : R2_ACCESS_KEY_ID;
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const canonicalPath = `/${R2_BUCKET_NAME}/${path}`;
    const url = `${endpoint}${canonicalPath}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
        'PUT',
        canonicalPath,
        '',
        `host:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        `x-amz-content-sha256:${payloadHash}`,
        `x-amz-date:${amzDate}`,
        '',
        'host;x-amz-content-sha256;x-amz-date',
        payloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256(canonicalRequest)
    ].join('\n');

    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, 'auto', 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDate,
            'Authorization': authorizationHeader,
        },
        body: audioBuffer,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`R2 upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    // Return public URL
    if (R2_PUBLIC_URL && !R2_PUBLIC_URL.includes('REPLACE')) {
        return `${R2_PUBLIC_URL}/${path}`;
    }
    return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${path}`;
}

// Generate TTS using ElevenLabs
async function generateTTS(text, voiceId) {
    console.log(`   🎤 Generating TTS for: "${text.substring(0, 40)}..." with voice ${voiceId}`);

    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`   ✅ Generated ${audioBuffer.byteLength} bytes`);
    return audioBuffer;
}

async function regenerateAudio(topicSlug) {
    console.log('🔄 Dictation Audio Regenerator\n');
    console.log(`🇺🇸 US Voice: Sarah (${US_VOICE})`);
    console.log(`🇬🇧 UK Voice: Alice (${UK_VOICE})\n`);

    // Get topic
    let topicQuery = supabase.from('dictation_topics').select('id, title, slug');

    if (topicSlug) {
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
            console.log(`\n[${i + 1}/${sentences.length}] "${sentence.sentence_text}"`);

            try {
                // Generate US audio
                console.log('   🇺🇸 Generating US audio...');
                const usAudioBuffer = await generateTTS(sentence.sentence_text, US_VOICE);
                const usPath = `dictation/us/${sentence.id}-${crypto.randomUUID().slice(0, 8)}.mp3`;
                const usUrl = await uploadToR2(usAudioBuffer, usPath);
                console.log(`   ✅ US uploaded: ${usUrl}`);

                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 500));

                // Generate UK audio
                console.log('   🇬🇧 Generating UK audio...');
                const ukAudioBuffer = await generateTTS(sentence.sentence_text, UK_VOICE);
                const ukPath = `dictation/uk/${sentence.id}-${crypto.randomUUID().slice(0, 8)}.mp3`;
                const ukUrl = await uploadToR2(ukAudioBuffer, ukPath);
                console.log(`   ✅ UK uploaded: ${ukUrl}`);

                // Update database
                const { error: updateError } = await supabase
                    .from('dictation_sentences')
                    .update({
                        audio_url_us: usUrl,
                        audio_url_uk: ukUrl
                    })
                    .eq('id', sentence.id);

                if (updateError) {
                    console.error(`   ❌ Failed to update database:`, updateError.message);
                } else {
                    console.log(`   ✅ Database updated`);
                }

                // Rate limiting
                await new Promise(r => setTimeout(r, 1000));

            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
            }
        }
    }

    console.log('\n\n🏁 Audio regeneration complete!');
}

// Get topic slug from command line args
const topicSlug = process.argv[2] || 'numbers-counting';
console.log(`\n🎯 Target topic: ${topicSlug}\n`);

regenerateAudio(topicSlug).catch(console.error);
