import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VOICES = [
  { id: 'US_M', accent: 'US', gender: 'male' },
  { id: 'US_F', accent: 'US', gender: 'female' },
  { id: 'UK_M', accent: 'UK', gender: 'male' },
  { id: 'UK_F', accent: 'UK', gender: 'female' },
];

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

    const ELEVEN = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVEN) throw new Error('Missing ELEVENLABS_API_KEY');

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const CLOUDFLARE_R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    const { card_id, term } = await req.json();
    if (!card_id || !term) throw new Error('card_id and term are required');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID!, secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY! }
    });

    async function generateForVoice(voice: { id: string; accent: string; gender: string }) {
      const voiceMap: Record<string, string> = {
        US_M: 'pMsXgVXv3BLQ9D2vY6o1',
        US_F: 'EXAVITQu4vr4xnSDxMaL',
        UK_M: 'TxGEqnHWrfWFTfGW9XjX',
        UK_F: '21m00Tcm4TlvDq8ikWAM',
      };
      const voice_id = voiceMap[voice.id];
      const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
        method: 'POST',
        headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVEN! },
        body: JSON.stringify({ text: term, model_id: 'eleven_turbo_v2_5' })
      });
      if (!tts.ok) throw new Error(await tts.text());
      const buf = await tts.arrayBuffer();
      const key = `vocab/pron/${voice.id}/${card_id}.mp3`;
      await s3.send(new PutObjectCommand({ Bucket: CLOUDFLARE_R2_BUCKET_NAME!, Key: key, Body: buf, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
      const url = `${CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
      await supabase.from('vocab_pronunciations').insert({ user_id: user.id, card_id, provider: 'elevenlabs', voice_id, accent: voice.accent, gender: voice.gender, url, format: 'mp3' });
      return url;
    }

    const urls: string[] = [];
    for (const v of VOICES) {
      try { urls.push(await generateForVoice(v)); } catch (e) { console.warn('voice failed', v.id, e); }
    }

    return new Response(JSON.stringify({ success: true, urls }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


