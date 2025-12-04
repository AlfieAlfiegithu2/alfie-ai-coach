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
const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');

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

// Upload image to R2
async function uploadToR2(imageBuffer: ArrayBuffer, path: string): Promise<string> {
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
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Authorization': authorizationHeader,
    },
    body: imageBuffer,
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

// Poll for Replicate prediction completion
async function waitForPrediction(predictionUrl: string, maxAttempts = 120): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const resp = await fetch(predictionUrl, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
    });
    const data = await resp.json();
    
    if (data.status === 'succeeded') {
      return data;
    } else if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Prediction ${data.status}: ${data.error || 'Unknown error'}`);
    }
    
    // Wait 500ms before polling again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Prediction timed out');
}

// Generate image using Replicate Flux Schnell
async function generateImage(term: string): Promise<{ buffer: ArrayBuffer | null; error: string | null; prompt: string }> {
  const prompt = `Simple, clean educational illustration of the concept "${term}". Minimalist icon style, white background, single centered object, no text, friendly and professional, suitable for vocabulary learning.`;
  
  console.log(`🎨 Generating image for: "${term}"`);
  
  try {
    // Create prediction with Replicate Flux Schnell
    const createResp = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-schnell',
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 80
        }
      })
    });

    if (!createResp.ok) {
      const errorText = await createResp.text();
      return { buffer: null, error: `Replicate API error: ${createResp.status} - ${errorText}`, prompt };
    }

    const prediction = await createResp.json();
    
    // Wait for the prediction to complete
    const completedPrediction = await waitForPrediction(
      `https://api.replicate.com/v1/predictions/${prediction.id}`
    );

    // Get the generated image URL
    const imageUrl = completedPrediction.output?.[0] || completedPrediction.output;
    if (!imageUrl) {
      return { buffer: null, error: 'No image URL in prediction output', prompt };
    }

    // Download the image
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) {
      return { buffer: null, error: `Failed to download image: ${imageResp.status}`, prompt };
    }
    
    const buffer = await imageResp.arrayBuffer();
    console.log(`✅ Image generated for "${term}", size: ${buffer.byteLength} bytes`);
    
    return { buffer, error: null, prompt };
  } catch (e: any) {
    console.error(`❌ Image generation failed for "${term}":`, e.message);
    return { buffer: null, error: e.message, prompt };
  }
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
      cardsPerRun = 10,
      continueFrom = null,
      diagnose = false
    } = body;
    
    // Diagnostic mode
    if (diagnose) {
      return new Response(JSON.stringify({
        hasReplicateKey: !!REPLICATE_API_TOKEN,
        replicateKeyLength: REPLICATE_API_TOKEN?.length || 0,
        hasR2AccountId: !!R2_ACCOUNT_ID,
        hasR2AccessKeyId: !!R2_ACCESS_KEY_ID,
        hasR2SecretKey: !!R2_SECRET_ACCESS_KEY,
        r2Bucket: R2_BUCKET_NAME,
        r2PublicUrl: R2_PUBLIC_URL?.substring(0, 30) || null
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate configuration
    if (!REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN');
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('Missing Cloudflare R2 configuration');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get cards that need images (LEFT JOIN to find cards without images in vocab_images)
    const { data: cards, error: cardsError } = await supabase
      .from('vocab_cards')
      .select(`
        id, 
        term,
        vocab_images!left(id)
      `)
      .eq('is_public', true)
      .eq('language', 'en')
      .is('vocab_images.id', null)
      .order('id', { ascending: true })
      .gt('id', continueFrom || '00000000-0000-0000-0000-000000000000')
      .limit(cardsPerRun);

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`);
    }

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No more cards need images',
        completed: true,
        stats: { processed: 0, generated: 0 }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`🎨 Generating images for ${cards.length} words...`);

    let generated = 0;
    let errors = 0;
    let lastCardId = '';
    let lastError = '';

    for (const card of cards) {
      // Check time limit
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏱️ Time limit reached after ${generated} image generations`);
        break;
      }

      try {
        console.log(`🔄 Processing card: ${card.id} - "${card.term}"`);
        
        // Generate image
        const { buffer: imageBuffer, error: imgError, prompt } = await generateImage(card.term);
        
        if (!imageBuffer || imgError) {
          console.error(`❌ Image generation failed for "${card.term}": ${imgError}`);
          if (!lastError) lastError = imgError || 'Unknown image error';
          errors++;
          continue;
        }

        // Upload to R2
        const path = `vocab/img/${card.id}.webp`;
        console.log(`📤 Uploading to R2: ${path}`);
        const imageUrl = await uploadToR2(imageBuffer, path);
        console.log(`✅ Uploaded to: ${imageUrl}`);

        // Insert into vocab_images table
        const { error: insertError } = await supabase
          .from('vocab_images')
          .insert({
            card_id: card.id,
            user_id: '00000000-0000-0000-0000-000000000000', // System user for batch operations
            provider: 'flux-schnell',
            url: imageUrl,
            width: 512,
            height: 512,
            format: 'webp',
            prompt,
            style: 'educational'
          });

        if (insertError) {
          console.error(`Failed to insert image record for ${card.id}:`, insertError);
          errors++;
          continue;
        }
        
        generated++;
        if (generated % 5 === 0) {
          console.log(`✅ Generated ${generated} images...`);
        }

        lastCardId = card.id;

        // Small delay to avoid rate limits (Replicate is faster than TTS)
        await new Promise(r => setTimeout(r, 200));

      } catch (error: any) {
        console.error(`Error processing ${card.term}:`, error);
        if (errors === 0) {
          lastError = error.message || String(error);
        }
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const hasMore = cards.length === cardsPerRun;

    console.log(`✅ Image batch complete: ${generated} generated, ${errors} errors, ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      stats: {
        cardsProcessed: cards.length,
        generated,
        errors,
        duration,
        lastError: lastError || null
      },
      hasMore,
      lastCardId,
      continueFrom: lastCardId
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Batch image error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

