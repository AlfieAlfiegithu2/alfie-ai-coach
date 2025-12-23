import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { createHmac, createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
let R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID') || Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY') || Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
let R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET') || Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') || 'alfie-ai-audio';
const R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GOOGLE_CLOUD_TTS_API_KEY = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY') || Deno.env.get('GOOGLE_CLOUD_API_KEY');
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

// Fix Access Key ID if it's 64 characters
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

// Upload audio to R2
async function uploadToR2(audioBuffer: ArrayBuffer, path: string): Promise<string> {
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalPath = `/${R2_BUCKET_NAME}/${path}`;
  const url = `${endpoint}${canonicalPath}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
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

  const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY!, dateStamp, 'auto', 's3');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

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

// Generate TTS - tries ElevenLabs first (best quality), then Google Cloud TTS
// Returns { buffer, error } to capture errors
async function generateTTS(text: string, voiceId: string = 'JBFqnCBsd6RMkjVDRZzb'): Promise<{ buffer: ArrayBuffer | null; error: string | null }> {
  console.log(`🎤 Generating TTS for: "${text}"`);
  console.log(`🔑 API Keys: ElevenLabs=${!!ELEVENLABS_API_KEY}, Google=${!!GOOGLE_CLOUD_TTS_API_KEY}`);

  // Try ElevenLabs first (best quality for vocabulary)
  if (ELEVENLABS_API_KEY) {
    console.log('🎯 Using ElevenLabs API...');
    try {
      // ElevenLabs voices: 
      // JBFqnCBsd6RMkjVDRZzb = Rachel (clear female)
      // pMsXgVXv3BLQ9D2vY6o1 = Patrick (clear male)
      // EXAVITQu4vr4xnSDxMaL = Bella (female)
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
            model_id: 'eleven_turbo_v2_5', // Fast, high quality
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true
            }
          })
        }
      );

      console.log(`📡 ElevenLabs response status: ${response.status}`);

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        console.log(`✅ ElevenLabs TTS success, size: ${audioBuffer.byteLength} bytes`);
        return { buffer: audioBuffer, error: null };
      }

      const errorText = await response.text();
      console.error(`❌ ElevenLabs error: ${response.status} - ${errorText}`);
      return { buffer: null, error: `ElevenLabs ${response.status}: ${errorText.substring(0, 100)}` };
    } catch (e: any) {
      console.error('❌ ElevenLabs exception:', e.message);
      return { buffer: null, error: `ElevenLabs exception: ${e.message}` };
    }
  } else {
    console.log('⚠️ ELEVENLABS_API_KEY not available');
  }

  // Fallback to Google Cloud TTS
  if (GOOGLE_CLOUD_TTS_API_KEY) {
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_TTS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: 'en-US', name: 'en-US-Neural2-D' },
            audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.audioContent) {
          console.log(`✅ Google TTS success`);
          const binaryString = atob(data.audioContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return { buffer: bytes.buffer, error: null };
        }
      }
    } catch (e: any) {
      console.log('⚠️ Google TTS error:', e.message);
    }
  }

  return { buffer: null, error: 'No TTS API configured (need ELEVENLABS_API_KEY or GOOGLE_CLOUD_TTS_API_KEY)' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 50000; // 50 seconds

  try {
    const body = await req.json().catch(() => ({}));
    const {
      cardsPerRun = 20,
      voice = 'JBFqnCBsd6RMkjVDRZzb', // ElevenLabs Rachel voice (clear female)
      continueFrom = null,
      diagnose = false,
      forceRegenerate = null // Array of terms to force regenerate, e.g. ["our", "bloom"]
    } = body;

    // Diagnostic mode
    if (diagnose) {
      return new Response(JSON.stringify({
        hasElevenLabsKey: !!ELEVENLABS_API_KEY,
        elevenLabsKeyLength: ELEVENLABS_API_KEY?.length || 0,
        hasGoogleCloudTtsKey: !!GOOGLE_CLOUD_TTS_API_KEY,
        googleCloudTtsKeyLength: GOOGLE_CLOUD_TTS_API_KEY?.length || 0,
        hasGeminiKey: !!GEMINI_API_KEY,
        geminiKeyLength: GEMINI_API_KEY?.length || 0,
        hasR2AccountId: !!R2_ACCOUNT_ID,
        hasR2AccessKeyId: !!R2_ACCESS_KEY_ID,
        hasR2SecretKey: !!R2_SECRET_ACCESS_KEY,
        r2Bucket: R2_BUCKET_NAME,
        r2PublicUrl: R2_PUBLIC_URL?.substring(0, 30) || null
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate configuration
    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('Missing Cloudflare R2 configuration');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get cards that need TTS
    // First try with audio_url filter, fall back to getting all cards if column doesn't exist
    let cards: any[] = [];
    let cardsError: any = null;
    let audioUrlColumnExists = true;

    // Force regenerate mode - get specific terms regardless of audio_url
    if (forceRegenerate && Array.isArray(forceRegenerate) && forceRegenerate.length > 0) {
      console.log(`🔄 Force regenerating TTS for: ${forceRegenerate.join(', ')}`);
      const { data, error } = await supabase
        .from('vocab_cards')
        .select('id, term')
        .eq('is_public', true)
        .eq('language', 'en')
        .in('term', forceRegenerate);

      cards = data || [];
      cardsError = error;

      if (cards.length > 0) {
        console.log(`🎯 Found ${cards.length} cards to regenerate`);
      }
    } else {
      // Normal mode - get cards without audio_url
      const result = await supabase
        .from('vocab_cards')
        .select('id, term')
        .eq('is_public', true)
        .eq('language', 'en')
        .is('audio_url', null)
        .order('id', { ascending: true })
        .gt('id', continueFrom || '00000000-0000-0000-0000-000000000000')
        .limit(cardsPerRun);

      // Check if error is about missing column
      if (result.error?.message?.includes('audio_url does not exist')) {
        console.log('⚠️ audio_url column does not exist! Please run this SQL in Supabase dashboard:');
        console.log('ALTER TABLE public.vocab_cards ADD COLUMN IF NOT EXISTS audio_url text;');
        audioUrlColumnExists = false;

        // Fall back to getting all cards (will re-generate all TTS)
        const fallbackResult = await supabase
          .from('vocab_cards')
          .select('id, term')
          .eq('is_public', true)
          .eq('language', 'en')
          .order('id', { ascending: true })
          .gt('id', continueFrom || '00000000-0000-0000-0000-000000000000')
          .limit(cardsPerRun);

        cards = fallbackResult.data || [];
        cardsError = fallbackResult.error;
      } else {
        cards = result.data || [];
        cardsError = result.error;
      }
    }

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`);
    }

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No more cards need TTS',
        completed: true,
        stats: { processed: 0, generated: 0 }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`🎤 Generating TTS for ${cards.length} words...`);
    console.log(`🔑 TTS API Keys available: ElevenLabs=${!!ELEVENLABS_API_KEY} (${ELEVENLABS_API_KEY?.length || 0}), Google=${!!GOOGLE_CLOUD_TTS_API_KEY}`);

    let generated = 0;
    let errors = 0;
    let lastCardId = '';
    let lastError = '';

    for (const card of cards) {
      // Check time limit
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏱️ Time limit reached after ${generated} TTS generations`);
        break;
      }

      try {
        console.log(`🔄 Processing card: ${card.id} - "${card.term}"`);

        // Generate TTS
        const { buffer: audioBuffer, error: ttsError } = await generateTTS(card.term, voice);

        if (!audioBuffer || ttsError) {
          console.error(`❌ TTS generation failed for "${card.term}": ${ttsError}`);
          if (!lastError) lastError = ttsError || 'Unknown TTS error';
          errors++;
          continue;
        }

        console.log(`✅ TTS generated for "${card.term}", size: ${audioBuffer.byteLength} bytes`);

        // Upload to R2 (MP3 format from Google TTS)
        const path = `vocab/tts/${card.id}.mp3`;
        console.log(`📤 Uploading to R2: ${path}`);
        const audioUrl = await uploadToR2(audioBuffer, path);
        console.log(`✅ Uploaded to: ${audioUrl}`);

        // Update card with audio URL (if column exists)
        if (audioUrlColumnExists) {
          const { error: updateError } = await supabase
            .from('vocab_cards')
            .update({ audio_url: audioUrl })
            .eq('id', card.id);

          if (updateError) {
            console.error(`Failed to update card ${card.id}:`, updateError);
            // Don't count as error if column doesn't exist
            if (!updateError.message?.includes('audio_url')) {
              errors++;
            }
          }
        }

        generated++;
        if (generated % 10 === 0) {
          console.log(`✅ Generated ${generated} TTS files...`);
        }

        lastCardId = card.id;

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 100));

      } catch (error: any) {
        console.error(`Error processing ${card.term}:`, error);
        // Store the error message for debugging
        if (errors === 0) {
          // @ts-ignore
          lastError = error.message || String(error);
        }
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const hasMore = cards.length === cardsPerRun;

    console.log(`✅ TTS batch complete: ${generated} generated, ${errors} errors, ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      stats: {
        cardsProcessed: cards.length,
        generated,
        errors,
        duration,
        voice,
        lastError: lastError || null,
        warning: !audioUrlColumnExists ? 'audio_url column missing - run: ALTER TABLE public.vocab_cards ADD COLUMN IF NOT EXISTS audio_url text;' : null
      },
      hasMore,
      lastCardId,
      continueFrom: lastCardId
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Batch TTS error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

