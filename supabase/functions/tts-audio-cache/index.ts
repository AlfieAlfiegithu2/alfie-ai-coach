import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { S3Client, PutObjectCommand, HeadObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment variables
const GOOGLE_CLOUD_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_CLOUD_API_KEY');
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
    // Validate environment variables
    if (!GOOGLE_CLOUD_API_KEY) {
      throw new Error('Google Cloud API key not configured (GEMINI_API_KEY or GOOGLE_CLOUD_API_KEY)');
    }
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID ||
        !CLOUDFLARE_R2_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME ||
        !CLOUDFLARE_R2_PUBLIC_URL) {
      throw new Error('Cloudflare R2 environment variables not configured');
    }

    const { text, language = 'en', voice = 'en-US-Neural2-J', speed = 1.0 } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log('🎵 TTS request:', { text: text.substring(0, 50), language, voice });

    // Generate cache key
    const cacheKey = `tts_${text.toLowerCase().trim()}_${language}_${voice}_${speed}`;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cacheKey));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const audioFileName = `tts-audio/${hashHex}.mp3`;

    // Initialize R2 client
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });

    // Check if audio already exists in R2
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: CLOUDFLARE_R2_BUCKET_NAME,
        Key: audioFileName,
      });
      await r2Client.send(headCommand);
      
      const publicUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${audioFileName}`;
      console.log('✅ TTS cache hit in R2:', publicUrl);

      // Track cache hit in analytics
      await supabase.from('audio_analytics').insert({
        action_type: 'tts_cache_hit',
        file_path: audioFileName,
        cache_key: hashHex,
      });

      return new Response(JSON.stringify({
        success: true,
        audioUrl: publicUrl,
        cached: true,
        source: 'r2'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.log('💨 TTS cache miss, generating audio...');
    }

    // Generate audio using Google Cloud TTS (standard API)
    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: language,
            name: voice,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speed,
            pitch: 0,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.json();
      throw new Error(`Google Cloud TTS error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const ttsData = await ttsResponse.json();
    const audioContent = ttsData.audioContent;

    if (!audioContent) {
      throw new Error('No audio content received from Google Cloud TTS');
    }

    // Decode base64 audio
    const audioBuffer = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));

    // Upload to R2
    const putCommand = new PutObjectCommand({
      Bucket: CLOUDFLARE_R2_BUCKET_NAME,
      Key: audioFileName,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(putCommand);

    const publicUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${audioFileName}`;
    console.log('✅ Google Cloud TTS audio generated and cached to R2:', publicUrl);

    // Track generation in analytics
    await supabase.from('audio_analytics').insert({
      action_type: 'tts_generated',
      file_path: audioFileName,
      cache_key: hashHex,
      file_size_bytes: audioBuffer.length,
    });

    return new Response(JSON.stringify({
      success: true,
      audioUrl: publicUrl,
      cached: false,
      source: 'google_cloud_tts'
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

