import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const DASH_API_KEY = Deno.env.get('DASHSCOPE_API_KEY');
    if (!DASH_API_KEY) throw new Error('Missing DASHSCOPE_API_KEY');

    const prompt = `High-quality pictorial icon illustrating the concept of "${term}" (English). Minimal, friendly, educational.`;

    const dashResp = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASH_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        input: { prompt, size: '512*512' }
      })
    });
    if (!dashResp.ok) throw new Error(await dashResp.text());
    const dashJson = await dashResp.json();
    const b64 = dashJson?.output?.b64_image || dashJson?.data?.[0]?.b64 || null;
    if (!b64) throw new Error('No image returned');

    const imgBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID!, secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY! }
    });

    const key = `vocab/img/${card_id}.webp`;
    await s3.send(new PutObjectCommand({ Bucket: CLOUDFLARE_R2_BUCKET_NAME!, Key: key, Body: imgBytes, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
    const url = `${CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

    // owner user id for RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    await supabase.from('vocab_images').insert({ user_id: user.id, card_id, provider: 'qwen', url, width: 512, height: 512, format: 'webp', prompt, style: 'educational' });

    return new Response(JSON.stringify({ success: true, url }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


