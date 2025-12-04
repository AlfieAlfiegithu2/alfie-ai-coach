import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Poll for Replicate prediction completion
async function waitForPrediction(predictionUrl: string, apiToken: string, maxAttempts = 60): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const resp = await fetch(predictionUrl, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    const data = await resp.json();
    
    if (data.status === 'succeeded') {
      return data;
    } else if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Prediction ${data.status}: ${data.error || 'Unknown error'}`);
    }
    
    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Prediction timed out');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { card_id, term } = await req.json();
    if (!card_id || !term) throw new Error('card_id and term are required');

    // Check if image already exists for this card
    const { data: existingImage } = await supabase
      .from('vocab_images')
      .select('url')
      .eq('card_id', card_id)
      .maybeSingle();
    
    if (existingImage?.url) {
      return new Response(JSON.stringify({ success: true, url: existingImage.url, cached: true }), { 
        headers: { ...cors, 'Content-Type': 'application/json' } 
      });
    }

    const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
    if (!REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN');

    // Create educational prompt for vocabulary illustration
    const prompt = `Simple, clean educational illustration of the concept "${term}". Minimalist icon style, white background, single centered object, no text, friendly and professional, suitable for vocabulary learning.`;

    console.log(`🎨 Generating image for "${term}" using Replicate Flux Schnell`);

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
      throw new Error(`Replicate API error: ${createResp.status} - ${errorText}`);
    }

    const prediction = await createResp.json();
    console.log(`📝 Prediction created: ${prediction.id}`);

    // Wait for the prediction to complete
    const completedPrediction = await waitForPrediction(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      REPLICATE_API_TOKEN
    );

    // Get the generated image URL
    const imageUrl = completedPrediction.output?.[0] || completedPrediction.output;
    if (!imageUrl) throw new Error('No image URL in prediction output');

    console.log(`✅ Image generated: ${imageUrl}`);

    // Download the image
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) throw new Error(`Failed to download image: ${imageResp.status}`);
    const imgBytes = new Uint8Array(await imageResp.arrayBuffer());

    // Upload to Cloudflare R2
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || !CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
      throw new Error('Missing Cloudflare R2 configuration');
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { 
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID!, 
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY! 
      }
    });

    const key = `vocab/img/${card_id}.webp`;
    await s3.send(new PutObjectCommand({ 
      Bucket: CLOUDFLARE_R2_BUCKET_NAME!, 
      Key: key, 
      Body: imgBytes, 
      ContentType: 'image/webp', 
      CacheControl: 'public, max-age=31536000, immutable' 
    }));
    
    const url = `${CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
    console.log(`☁️ Uploaded to R2: ${url}`);

    // Get user for RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    // Insert into vocab_images table
    await supabase.from('vocab_images').insert({ 
      user_id: user.id, 
      card_id, 
      provider: 'flux-schnell', 
      url, 
      width: 512, 
      height: 512, 
      format: 'webp', 
      prompt, 
      style: 'educational' 
    });

    return new Response(JSON.stringify({ success: true, url }), { 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    console.error('❌ Error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String((e as any).message || e) 
    }), { 
      status: 500, 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });
  }
});
