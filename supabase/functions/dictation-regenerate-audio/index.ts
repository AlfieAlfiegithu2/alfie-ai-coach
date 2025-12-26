// @ts-ignore: Deno modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
// @ts-ignore: Deno modules
import { createHmac, createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";

declare const Deno: any;
declare const crypto: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
let R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID') || Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY') || Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET') || 'alfie-ai-audio';
const R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

if (R2_ACCESS_KEY_ID && R2_ACCESS_KEY_ID.length === 64) {
    R2_ACCESS_KEY_ID = R2_ACCESS_KEY_ID.slice(0, 32);
}

// AWS Signature V4 helpers
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
    const kDate = createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(regionName).digest();
    const kService = createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
}

function sha256(data: string | ArrayBuffer) {
    const hash = createHash('sha256');
    hash.update(typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data));
    return hash.digest('hex');
}

async function uploadToR2(audioData: Uint8Array | ArrayBuffer, path: string, contentType: string): Promise<string> {
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const canonicalPath = `/${R2_BUCKET_NAME}/${path}`;
    const url = `${endpoint}${canonicalPath}`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = 'UNSIGNED-PAYLOAD';
    const canonicalRequest = ['PUT', canonicalPath, '', `host:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, `x-amz-content-sha256:${payloadHash}`, `x-amz-date:${amzDate}`, '', 'host;x-amz-content-sha256;x-amz-date', payloadHash].join('\n');
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n');
    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY!, dateStamp, 'auto', 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;
    const resp = await fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, 'Authorization': authHeader }, body: audioData as BodyInit });
    if (!resp.ok) throw new Error(`R2 upload failed: ${await resp.text()}`);
    return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${path}` : `https://pub-e7bc45b90c224d7f9831b818217cf02d.r2.dev/${path}`;
}

function pcmToWav(pcmData: Uint8Array): Uint8Array {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46); // RIFF
    view.setUint32(4, 36 + pcmData.length, true);
    view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45); // WAVE
    view.setUint8(12, 0x66); view.setUint8(13, 0x6D); view.setUint8(14, 0x74); view.setUint8(15, 0x20); // fmt
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true);
    view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61); // data
    view.setUint32(40, pcmData.length, true);
    const wavData = new Uint8Array(44 + pcmData.length);
    wavData.set(new Uint8Array(wavHeader), 0);
    wavData.set(pcmData, 44);
    return wavData;
}

async function generateGeminiAudio(text: string, accent: 'us' | 'uk'): Promise<Uint8Array> {
    const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Zephyr'];
    const voiceName = voices[Math.floor(Math.random() * voices.length)];

    // User requested simplified prompting
    const prompt = accent === 'us'
        ? `Read aloud with US accent: "${text}"`
        : `Read aloud with UK accent: "${text}"`;

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                response_modalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName
                        }
                    }
                }
            }
        })
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Gemini ${accent.toUpperCase()} failed: ${err}`);
    }

    const data = await resp.json();
    const audioContent = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
        data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    if (!audioContent) {
        throw new Error(`No audio from Gemini ${accent.toUpperCase()}`);
    }

    const binary = atob(audioContent);
    const pcm = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);

    return pcmToWav(pcm);
}

async function generateElevenLabsAudio(text: string, accent: 'us' | 'uk', apiKey: string): Promise<ArrayBuffer> {
    // US Voices (Avoiding Rachel)
    const usVoices = [
        'ErXwobaYiN019PkySvjV', // Antoni - Well balanced
        'TxGEqnHWrfWFTfGW9XjX', // Josh - Deep, clear
        'EXAVITQu4vr4xnSDxMaL', // Bella - Soft, professional
        'AZnzlk1XvdvUeBnXmlld'  // Domi - Strong American
    ];

    // UK Voices
    const ukVoices = [
        'JBFqnCBsd6RMkjVDRZzb', // George - Standard British
        'CwhRBWXzGAHq8TQ4Fs17', // Roger - Dignified
        'Xb7hH8MSUJpSbSDYk0k2'  // Alice - Newsreader
    ];

    const pool = accent === 'us' ? usVoices : ukVoices;
    const finalVoiceId = pool[Math.floor(Math.random() * pool.length)];

    console.log(`Using ElevenLabs Voice: ${finalVoiceId} for ${accent}`);

    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
        },
        body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
    });

    if (!resp.ok) {
        throw new Error(`ElevenLabs ${accent.toUpperCase()} failed: ${await resp.text()}`);
    }

    return await resp.arrayBuffer();
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    try {
        const { topicSlug = 'numbers-counting', limit = 10, apiKey, provider = 'gemini', elevenLabsKey } = await req.json().catch(() => ({}));
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } });

        const activeGeminiKey = apiKey || GEMINI_API_KEY;

        const { data: topic } = await supabase.from('dictation_topics').select('id').eq('slug', topicSlug).single();
        if (!topic) throw new Error(`Topic ${topicSlug} not found`);

        const { data: sentences } = await supabase.from('dictation_sentences').select('id, sentence_text').eq('topic_id', topic.id).order('order_index').limit(limit);
        if (!sentences) return new Response(JSON.stringify({ success: true, processed: 0 }));

        console.log(`🚀 Regenerating via ${provider} | Topic: ${topicSlug}`);

        const results = [];
        for (const s of sentences) {
            console.log(`Processing: ${s.sentence_text.substring(0, 30)}...`);
            try {
                let usUrl, ukUrl;

                if (provider === 'elevenlabs') {
                    if (!elevenLabsKey) throw new Error('ElevenLabs key required');

                    // US
                    const usAudio = await generateElevenLabsAudio(s.sentence_text, 'us', elevenLabsKey);
                    const usPath = `dictation/us/${s.id}-${crypto.randomUUID().slice(0, 8)}.mp3`;
                    usUrl = await uploadToR2(usAudio, usPath, 'audio/mpeg');

                    // UK
                    const ukAudio = await generateElevenLabsAudio(s.sentence_text, 'uk', elevenLabsKey);
                    const ukPath = `dictation/uk/${s.id}-${crypto.randomUUID().slice(0, 8)}.mp3`;
                    ukUrl = await uploadToR2(ukAudio, ukPath, 'audio/mpeg');

                } else {
                    // Gemini Logic (Existing)
                    // Modified helper to accept key
                    const generateAudioWithKey = async (text: string, accent: 'us' | 'uk') => {
                        const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Zephyr'];
                        const voiceName = voices[Math.floor(Math.random() * voices.length)];
                        const prompt = accent === 'us' ? `Read aloud with US accent: "${text}"` : `Read aloud with UK accent: "${text}"`;

                        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${activeGeminiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }],
                                generationConfig: {
                                    response_modalities: ['AUDIO'],
                                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
                                }
                            })
                        });

                        if (!resp.ok) {
                            const err = await resp.text();
                            throw new Error(`Gemini ${accent.toUpperCase()} failed: ${err}`);
                        }

                        const data = await resp.json();
                        const audioContent = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
                        if (!audioContent) throw new Error(`No audio from Gemini ${accent.toUpperCase()}`);

                        const binary = atob(audioContent);
                        const pcm = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);
                        return pcmToWav(pcm);
                    };

                    // US Audio via Gemini
                    const usWav = await generateAudioWithKey(s.sentence_text, 'us');
                    const usPath = `dictation/us/${s.id}-${crypto.randomUUID().slice(0, 8)}.wav`;
                    usUrl = await uploadToR2(usWav, usPath, 'audio/wav');

                    // UK Audio via Gemini
                    const ukWav = await generateAudioWithKey(s.sentence_text, 'uk');
                    const ukPath = `dictation/uk/${s.id}-${crypto.randomUUID().slice(0, 8)}.wav`;
                    ukUrl = await uploadToR2(ukWav, ukPath, 'audio/wav');
                }

                await supabase.from('dictation_sentences').update({
                    audio_url_us: usUrl,
                    audio_url_uk: ukUrl
                }).eq('id', s.id);

                results.push({ id: s.id, status: 'success' });

                // Small delay to avoid hitting rate limits
                await new Promise(r => setTimeout(r, 500));
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error(`Error for ${s.id}: ${errorMessage}`);
                results.push({ id: s.id, status: 'error', error: errorMessage });

                // If we hit rate limit (429), break or wait longer
                if (errorMessage.includes('429')) {
                    console.log('Rate limit hit, pausing...');
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }
        return new Response(JSON.stringify({ success: true, processed: results.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});

