import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

// Voice mapping from ElevenLabs to OpenAI
const voiceMapping = {
  '9BWtsMINqrJLrRacOk9x': 'nova',
  'CwhRBWXzGAHq8TQ4Fs17': 'onyx',
  'EXAVITQu4vr4xnSDxMaL': 'shimmer',
  'FGY2WhTYpPnrIDTdsKH5': 'alloy',
  'IKne3meq5aSn9XLyUdCD': 'echo',
  'JBFqnCBsd6RMkjVDRZzb': 'fable',
  'default': 'nova'
};

const mapVoice = (voiceId: string): string => {
  return voiceMapping[voiceId as keyof typeof voiceMapping] || voiceMapping.default;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');
    
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || !CLOUDFLARE_R2_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME || !CLOUDFLARE_R2_PUBLIC_URL) {
      throw new Error('Cloudflare R2 environment variables not configured');
    }

    // Initialize R2 client
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
      logger: undefined,
    });

    // Parse request - support both old ElevenLabs format and new format
    const { text, voice, voice_id, questionId, question_id } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    // Map ElevenLabs voice IDs to OpenAI voices
    const inputVoiceId = voice_id || voice || 'default';
    const mappedVoice = mapVoice(inputVoiceId);
    const cacheKey = question_id || questionId;

    console.log('TTS Request:', { 
      text: text.substring(0, 100), 
      originalVoice: inputVoiceId, 
      mappedVoice, 
      questionId: cacheKey 
    });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if audio already exists in cache
    if (cacheKey) {
      console.log(`🔍 Checking cache for question ${cacheKey}`);
      const { data: cached, error: cacheError } = await supabase
        .from('audio_cache')
        .select('storage_path, file_size_bytes, play_count')
        .eq('question_id', cacheKey)
        .eq('voice', mappedVoice)
        .single();

      if (!cacheError && cached?.storage_path) {
        // Get public URL from R2
        const publicUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${cached.storage_path}`;

        // Track cache hit
        await supabase.from('audio_analytics').insert({
          question_id: cacheKey,
          voice: mappedVoice,
          action_type: 'cache_hit',
          file_size_bytes: cached.file_size_bytes,
          storage_path: cached.storage_path
        });

        // Update play count
        await supabase.from('audio_cache')
          .update({ play_count: (cached.play_count || 0) + 1 })
          .eq('question_id', cacheKey)
          .eq('voice', mappedVoice);

        console.log(`✅ Cache hit for ${cacheKey} - Saved API cost and egress!`);
        return new Response(
          JSON.stringify({ 
            audio_url: publicUrl,
            cached: true,
            success: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`🎵 Generating new audio with OpenAI TTS...`);

    // Generate speech from text using OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: mappedVoice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS API error: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBlob = new Uint8Array(arrayBuffer);
    const fileSize = audioBlob.byteLength;

    // Upload to R2 bucket instead of Supabase Storage
    if (cacheKey) {
      const fileName = `audio/${cacheKey}_${mappedVoice}_${Date.now()}.mp3`;
      
      console.log(`💾 Uploading ${(fileSize / 1024).toFixed(2)}KB to Cloudflare R2...`);
      
      try {
        const putCommand = new PutObjectCommand({
          Bucket: CLOUDFLARE_R2_BUCKET_NAME,
          Key: fileName,
          Body: audioBlob,
          ContentType: 'audio/mpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        });
        await r2Client.send(putCommand);
      } catch (uploadError) {
        console.error('R2 upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL from R2
      const publicUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;

      // Save to cache
      await supabase.from('audio_cache').upsert({
        question_id: cacheKey,
        voice: mappedVoice,
        storage_path: fileName,
        audio_url: publicUrl,
        file_size_bytes: fileSize,
        text_hash: btoa(text),
        play_count: 1,
        updated_at: new Date().toISOString()
      });

      // Track generation in analytics
      await supabase.from('audio_analytics').insert({
        question_id: cacheKey,
        voice: mappedVoice,
        action_type: 'generate',
        file_size_bytes: fileSize,
        storage_path: fileName
      });

      console.log(`✅ Audio cached to R2 successfully - ${(fileSize / 1024).toFixed(2)}KB (Zero egress!)`);

      return new Response(
        JSON.stringify({ 
          audio_url: publicUrl,
          cached: false,
          success: true,
          file_size: fileSize
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: return base64 if no cache key
    const base64Audio = btoa(String.fromCharCode(...audioBlob));
    return new Response(
      JSON.stringify({ 
        audio_url: `data:audio/mp3;base64,${base64Audio}`,
        cached: false,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TTS cache error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      env_vars: {
        hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
        hasSupabase: !!Deno.env.get('SUPABASE_URL'),
        hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        hasCloudflareAccount: !!Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),
        hasCloudflareAccessKey: !!Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID'),
        hasCloudflareSecret: !!Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
        hasCloudflareBucket: !!Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME'),
        hasCloudflarePublicUrl: !!Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL'),
      }
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        debug: {
          hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
          hasCloudflare: !!Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),
          missingVars: [
            !Deno.env.get('OPENAI_API_KEY') && 'OPENAI_API_KEY',
            !Deno.env.get('SUPABASE_URL') && 'SUPABASE_URL',
            !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') && 'SUPABASE_SERVICE_ROLE_KEY',
            !Deno.env.get('CLOUDFLARE_ACCOUNT_ID') && 'CLOUDFLARE_ACCOUNT_ID',
            !Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID') && 'CLOUDFLARE_R2_ACCESS_KEY_ID',
            !Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') && 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
            !Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') && 'CLOUDFLARE_R2_BUCKET_NAME',
            !Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL') && 'CLOUDFLARE_R2_PUBLIC_URL',
          ].filter(Boolean)
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});