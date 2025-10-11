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

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (!DEEPSEEK_API_KEY) throw new Error('Missing DEEPSEEK_API_KEY');

    const { card_id, term, pos = null } = await req.json();
    if (!card_id || !term) throw new Error('card_id and term are required');

    const system = `Generate useful English example sentences for a vocabulary item. JSON array only.
Rules: 2 sentences, 8–16 words, CEFR B1 style, the target word appears exactly once, use correct POS if provided (${pos||'unknown'}).`;
    const user = `word: ${term}\nreturn: ["...", "..."]`;

    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: 300 })
    });
    if (!resp.ok) throw new Error(await resp.text());
    const json = await resp.json();
    let raw = json?.choices?.[0]?.message?.content || '[]';
    let arr: string[] = [];
    try { arr = JSON.parse(raw); } catch { const m = raw.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch {} } }
    arr = (arr || []).filter((s) => typeof s === 'string').slice(0,2);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');
    const inserts = arr.map((sentence) => ({ user_id: user.id, card_id, lang: 'en', sentence, cefr: 'B1', quality: 1 }));
    if (inserts.length) await supabase.from('vocab_examples').insert(inserts);

    return new Response(JSON.stringify({ success: true, sentences: arr }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


