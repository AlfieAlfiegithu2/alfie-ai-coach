import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

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

    const body = await req.json().catch(()=>({}));
    const total = Math.min(Number(body?.total || 20), 200);
    const words: string[] = Array.isArray(body?.words) ? body.words.slice(0, total) : [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    // If words not provided, try seed small sample via admin seed with total
    if (!words.length) {
      const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vocab-admin-seed`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ total }) });
      if (!r.ok) throw new Error(await r.text());
    }

    // Fetch recent cards to enrich assets
    const { data: cards } = await supabase
      .from('vocab_cards')
      .select('id, term, pos')
      .order('created_at', { ascending: false })
      .limit(total);

    for (const c of (cards||[])) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vocab-generate-examples`, { method:'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ card_id: c.id, term: c.term, pos: c.pos||null }) });
      } catch(e) { console.warn('examples failed', c.term, e); }
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vocab-generate-tts`, { method:'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ card_id: c.id, term: c.term }) });
      } catch(e) { console.warn('tts failed', c.term, e); }
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vocab-generate-image`, { method:'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ card_id: c.id, term: c.term }) });
      } catch(e) { console.warn('image failed', c.term, e); }
      // small delay to stay under rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    return new Response(JSON.stringify({ success: true, processed: (cards||[]).length }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


