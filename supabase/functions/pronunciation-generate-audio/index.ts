import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ElevenLabs voice IDs for UK and US accents
const VOICE_IDS = {
  uk: '21m00Tcm4TlvDq8ikWAM', // Rachel - British accent
  us: 'EXAVITQu4vr4xnSDxMaL', // Bella - American accent
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, accent, test_id, item_id } = await req.json();

    // Validate inputs
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }
    if (!accent || !['uk', 'us'].includes(accent)) {
      throw new Error('Accent must be "uk" or "us"');
    }
    if (!test_id) {
      throw new Error('test_id is required');
    }
    if (!item_id) {
      throw new Error('item_id is required');
    }

    // Get environment variables
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    if (!elevenlabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || 
        !CLOUDFLARE_R2_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME || 
        !CLOUDFLARE_R2_PUBLIC_URL) {
      throw new Error('Cloudflare R2 environment variables not configured');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the voice ID for the selected accent
    const voiceId = VOICE_IDS[accent as keyof typeof VOICE_IDS];

    console.log(`Generating ${accent.toUpperCase()} audio for: "${text.substring(0, 50)}..."`);

    // Call ElevenLabs TTS API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsApiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    console.log(`Audio generated, size: ${audioBuffer.byteLength} bytes`);

    // Upload to Cloudflare R2
    const audioFileName = `pronunciation/${test_id}/${item_id}_${accent}.mp3`;
    
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
      Body: new Uint8Array(audioBuffer),
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);
    console.log(`Uploaded to R2: ${audioFileName}`);

    const publicUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${audioFileName}`;

    // Update the pronunciation_items table with the new audio URL
    const updateColumn = accent === 'uk' ? 'audio_url_uk' : 'audio_url_us';
    const { error: updateError } = await supabase
      .from('pronunciation_items')
      .update({ [updateColumn]: publicUrl })
      .eq('id', item_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    console.log(`✅ Successfully generated and saved ${accent.toUpperCase()} audio`);

    return new Response(JSON.stringify({
      success: true,
      audio_url: publicUrl,
      accent,
      item_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in pronunciation-generate-audio:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

