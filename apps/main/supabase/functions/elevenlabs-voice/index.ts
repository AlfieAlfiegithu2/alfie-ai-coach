import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice_id = "9BWtsMINqrJLrRacOk9x", question_id } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    // R2 Configuration
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');
    if (!elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || 
        !CLOUDFLARE_R2_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME || 
        !CLOUDFLARE_R2_PUBLIC_URL) {
      throw new Error('Cloudflare R2 environment variables not configured');
    }

    // Create Supabase client for caching
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate hash for caching
    const textHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text + voice_id));
    const hashArray = Array.from(new Uint8Array(textHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache first
    const { data: cachedAudio } = await supabase
      .from('audio_cache')
      .select('audio_url')
      .eq('text_hash', hashHex)
      .eq('voice', voice_id)
      .single();

    if (cachedAudio?.audio_url) {
      console.log('✅ Returning cached audio');
      return new Response(JSON.stringify({ 
        success: true,
        audio_url: cachedAudio.audio_url,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate new audio
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsApiKey
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || 'Failed to generate speech');
    }

    // Convert audio to base64 and upload to R2 storage
    const audioBuffer = await response.arrayBuffer();
    const audioFileName = `audio/${hashHex}.mp3`;
    
    // Upload to R2 instead of Supabase storage
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

    // Cache the result
    await supabase.from('audio_cache').insert({
      question_id: question_id || null,
      text_hash: hashHex,
      voice: voice_id,
      audio_url: publicUrl
    });

    console.log('✅ Generated and cached new audio');

    return new Response(JSON.stringify({ 
      success: true,
      audio_url: publicUrl,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in elevenlabs-voice:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});