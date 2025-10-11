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

    // Use anon key bound to caller's JWT so RLS and rpc(is_admin) apply to the current user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
    );

    const body = await req.json().catch(() => ({}));
    const total = Math.min(Number(body?.total || 5000), 20000);
    const translateTo = String(body?.translateTo || 'ko');
    const language = String(body?.language || 'en');
    const levels = body?.levels || { 1: 1800, 2: 1700, 3: 1100, 4: 300, 5: 100 }; // sums to 5000
    // Enforce admin-only
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) throw new Error('Unauthorized');
    const { data: isAdmin } = await (supabase as any).rpc('is_admin');
    if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    const ownerUserId = user.id;

    // Create job row under owner for progress tracking
    const { data: job, error: jobErr } = await supabase
      .from('jobs_vocab_seed')
      .insert({ user_id: ownerUserId, total, status: 'running' })
      .select('*')
      .single();
    if (jobErr) throw jobErr;

    async function fetchBatch(level: number, limit: number) {
      const ranges: Record<number, [number, number]> = {
        1: [1, 1500],
        2: [1501, 4000],
        3: [4001, 8000],
        4: [8001, 15000],
        5: [1501, 12000],
      };
      const [min, max] = ranges[level] || [1, 5000];
      const { data } = await supabase
        .from('vocab_frequency')
        .select('lemma, rank')
        .eq('language', language)
        .gte('rank', min)
        .lte('rank', max)
        .order('rank', { ascending: true })
        .limit(limit);
      return (data || []).map((r: any) => ({ lemma: r.lemma, rank: r.rank }));
    }

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    async function aiSuggestTerms(level: number, count: number): Promise<string[]> {
      if (!DEEPSEEK_API_KEY) return [];
      const levelDesc: Record<number, string> = {
        1: 'easiest functional/common everyday words',
        2: 'high-frequency everyday core vocabulary',
        3: 'intermediate general vocabulary',
        4: 'upper-intermediate news/business vocabulary',
        5: 'academic/journalistic but not rare vocabulary'
      };
      const system = `List ${count} ${language} lemmas (${levelDesc[level]}) as a flat JSON array of strings. No commentary.`;
      const prompt = { model: 'deepseek-chat', messages: [{ role: 'system', content: system }], temperature: 0.2, max_tokens: 400, stream: false } as const;
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      const raw = data?.choices?.[0]?.message?.content || '[]';
      try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr.slice(0, count) : []; } catch {
        const m = typeof raw === 'string' ? raw.match(/\[[\s\S]*\]/) : null; if (m) { try { const arr = JSON.parse(m[0]); return Array.isArray(arr) ? arr.slice(0, count) : []; } catch {} }
        return [];
      }
    }

    async function enrich(term: string, context: string | null, level: number) {
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vocab-enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, context: context || '', targetLanguage: language, nativeLanguage: translateTo, level })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'enrich failed');
      return data.card;
    }

    let completed = 0;
    for (const [levelStr, count] of Object.entries(levels)) {
      const level = Number(levelStr);
      const target = Math.min(Number(count), total - completed);
      if (target <= 0) break;
      const batch = await fetchBatch(level, Math.max(10, Math.min(50, target)));
      let deckId: string | null = null;
      let deckCount = 0;
      let deckSeq = 0;
      async function ensureDeck() {
        if (deckId && deckCount < 20) return;
        deckSeq += 1;
        const { data: deck, error: deckErr } = await supabase
          .from('vocab_decks')
          .insert({ user_id: ownerUserId, name: `L${level} • Deck ${deckSeq}`, level, is_public: true })
          .select('id')
          .single();
        if (deckErr) throw deckErr;
        deckId = deck?.id || null;
        deckCount = 0;
      }
      let items = batch;
      if (items.length === 0) {
        const suggested = await aiSuggestTerms(level, Math.max(10, Math.min(30, target)));
        items = suggested.map((s) => ({ lemma: String(s), rank: null }));
      }
      for (const { lemma, rank } of items) {
        if (completed >= total) break;
        const { data: exists } = await supabase
          .from('vocab_cards')
          .select('id')
          .eq('term', lemma)
          .eq('language', language)
          .eq('is_public', true)
          .maybeSingle();
        if (exists) continue;
        try {
          await ensureDeck();
          const card = await enrich(lemma, null, level);
          await supabase.from('vocab_cards').insert({
            user_id: ownerUserId,
            deck_id: deckId,
            term: lemma,
            translation: card.translation,
            pos: card.pos || null,
            ipa: card.ipa || null,
            examples_json: Array.isArray(card.examples) ? card.examples.slice(0,3) : [],
            frequency_rank: card.frequencyRank || rank || null,
            language,
            level,
            is_public: true
          });
          deckCount += 1;
          completed += 1;
          if (completed % 20 === 0) {
            await supabase.from('jobs_vocab_seed').update({ completed, level, updated_at: new Date().toISOString() }).eq('id', job.id);
          }
        } catch (e) {
          await supabase.from('jobs_vocab_seed').update({ last_error: String((e as any)?.message || e), last_term: lemma }).eq('id', job.id);
        }
        if (completed >= total) break;
      }
    }

    await supabase.from('jobs_vocab_seed').update({ completed, status: 'done', updated_at: new Date().toISOString() }).eq('id', job.id);
    return new Response(JSON.stringify({ success: true, jobId: job.id, completed, total }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


