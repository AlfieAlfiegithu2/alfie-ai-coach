import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment variables
const AZURE_TTS_API_KEY = Deno.env.get('AZURE_TTS_API_KEY');
const AZURE_TTS_REGION = Deno.env.get('AZURE_TTS_REGION');
const GOOGLE_CLOUD_TTS_API_KEY = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY') || Deno.env.get('GOOGLE_CLOUD_API_KEY');
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Cloudflare R2 Configuration
const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables (at least one provider)
    if (!AZURE_TTS_API_KEY && !GOOGLE_CLOUD_TTS_API_KEY && !ELEVENLABS_API_KEY && !GEMINI_API_KEY) {
      throw new Error('No TTS provider configured');
    }

    const { text, language = 'en-US', voice = 'en-US-Neural2-J', speed = 1.0, provider = 'auto' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    // Validate R2 configuration
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || 
        !CLOUDFLARE_R2_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME || 
        !CLOUDFLARE_R2_PUBLIC_URL) {
      throw new Error('Cloudflare R2 environment variables not configured');
    }

    console.log('🎵 TTS request:', { text: text.substring(0, 50), language, voice, provider });

    // Generate cache key
    const cacheKey = `tts_${text.toLowerCase().trim()}_${language}_${voice}_${speed}_${provider}`;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cacheKey));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const audioFileName = `tts-cache/${hashHex}.mp3`;

    // Check if audio already exists in cache
    const { data: cachedAudio } = await supabase
      .from('audio_cache')
      .select('audio_url')
      .eq('text_hash', hashHex)
      .single();

    if (cachedAudio?.audio_url) {
      console.log('✅ TTS cache hit (R2):', cachedAudio.audio_url);

      // Track cache hit in analytics
      await supabase.from('audio_analytics').insert({
        action_type: 'tts_cache_hit',
        storage_path: audioFileName,
      });

      return new Response(JSON.stringify({
        success: true,
        audioUrl: cachedAudio.audio_url,
        cached: true,
        source: 'r2'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('ℹ️ Cache miss, will generate audio...');

    // Helper to decode base64 to Uint8Array
    const decodeBase64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    // Decide provider (explicit > auto preference: ElevenLabs > Azure > Google > Gemini)
    const tryOrder = (() => {
      if (provider !== 'auto') return [provider];
      const list: string[] = [];
      if (ELEVENLABS_API_KEY) list.push('elevenlabs');
      if (AZURE_TTS_API_KEY) list.push('azure');
      if (GOOGLE_CLOUD_TTS_API_KEY) list.push('google');
      if (GEMINI_API_KEY) list.push('gemini');
      return list.length ? list : ['elevenlabs'];
    })();

    let audioBuffer: Uint8Array | ArrayBuffer | null = null;
    let usedProvider = 'unknown';
    let lastError: unknown = null;

    for (const p of tryOrder) {
      try {
        if (p === 'azure') {
          if (!AZURE_TTS_API_KEY || !AZURE_TTS_REGION) throw new Error('Azure TTS not configured');
          const resp = await fetch(`https://${AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
            {
              method: 'POST',
              headers: {
                'Ocp-Apim-Subscription-Key': AZURE_TTS_API_KEY,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
              },
              body: `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language}'>
                <voice name='${voice}'>
                  <prosody rate='${speed}'>${text}</prosody>
                </voice>
              </speak>`,
            }
          );
          if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`Azure TTS error: ${err}`);
          }
          audioBuffer = new Uint8Array(await resp.arrayBuffer());
          usedProvider = 'azure';
          break;
        }
        if (p === 'google') {
          if (!GOOGLE_CLOUD_TTS_API_KEY) throw new Error('Google TTS not configured');
          const resp = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_TTS_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                input: { text },
                voice: { languageCode: language, name: voice },
                audioConfig: { audioEncoding: 'MP3', speakingRate: speed },
              }),
            }
          );
          if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`Google TTS error: ${err}`);
          }
          const data = await resp.json();
          if (!data.audioContent) throw new Error('Google TTS: missing audioContent');
          audioBuffer = decodeBase64(data.audioContent);
          usedProvider = 'google';
          break;
        }
        if (p === 'elevenlabs') {
          if (!ELEVENLABS_API_KEY) throw new Error('ElevenLabs not configured');
          // Use ElevenLabs voice ID (Rachel voice from documentation)
          const voiceId = 'JBFqnCBsd6RMkjVDRZzb';
          console.log('🎤 ElevenLabs TTS request:', { text: text.substring(0, 50), voiceId });
          const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
              },
              body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                output_format: 'mp3_44100_128',
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.5,
                  style: 0.0,
                  use_speaker_boost: true,
                },
              }),
            }
          );
          if (!resp.ok) {
            const err = await resp.text();
            console.error('❌ ElevenLabs error:', { status: resp.status, error: err });
            throw new Error(`ElevenLabs error (${resp.status}): ${err}`);
          }
          audioBuffer = await resp.arrayBuffer();
          usedProvider = 'elevenlabs';
          console.log('✅ ElevenLabs TTS successful');
          break;
        }
        if (p === 'gemini') {
          if (!GEMINI_API_KEY) throw new Error('Gemini not configured');
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-tts:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text }] }],
              })
            }
          );
          if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`Gemini TTS error: ${err}`);
          }
          const data = await resp.json();
          const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.audioData;
          if (!audioData) throw new Error('Gemini TTS: missing audioData');
          audioBuffer = decodeBase64(audioData);
          usedProvider = 'gemini';
          break;
        }
      } catch (err) {
        lastError = err;
        console.error(`Provider ${p} failed:`, err);
      }
    }

    if (!audioBuffer) {
      throw new Error(`All TTS providers failed. Last error: ${lastError}`);
    }

    // Upload to Cloudflare R2
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new PutObjectCommand({
      Bucket: CLOUDFLARE_R2_BUCKET_NAME,
      Key: audioFileName,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);
    
    const publicUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${audioFileName}`;

    console.log('✅ TTS audio generated and cached to R2:', { publicUrl, usedProvider });

    // Cache the audio URL in database
    await supabase.from('audio_cache').insert({
      text_hash: hashHex,
      voice: voice,
      audio_url: publicUrl,
      storage_path: audioFileName,
    });

    // Track generation in analytics
    await supabase.from('audio_analytics').insert({
      action_type: 'tts_generated',
      storage_path: audioFileName,
      file_size_bytes: (audioBuffer instanceof Uint8Array ? audioBuffer.length : (audioBuffer as ArrayBuffer).byteLength),
    });

    return new Response(JSON.stringify({
      success: true,
      audioUrl: publicUrl,
      cached: false,
      source: usedProvider
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ TTS error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
