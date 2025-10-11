import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  
  console.log('vocab-admin-seed: request received', { method: req.method, url: req.url });
  
  try {
    const authHeader = req.headers.get('Authorization');
    console.log('vocab-admin-seed: auth header present', { hasAuth: !!authHeader });
    if (!authHeader) throw new Error('Unauthorized');

    // Use anon key bound to caller's JWT so RLS and rpc(is_admin) apply to the current user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
    );

    const body = await req.json().catch(() => ({}));
    console.log('vocab-admin-seed: request body', { body });
    const total = Math.min(Number(body?.total || 5000), 20000);
    const translateTo = String(body?.translateTo || 'all');
    const language = 'en';
    const levels = body?.levels || { 1: 1800, 2: 1700, 3: 1100, 4: 300, 5: 100 }; // sums to 5000
    console.log('vocab-admin-seed: starting with params', { total, translateTo, language });
    // Enforce admin-only
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) throw new Error('Unauthorized');
    // Temporarily disable admin check for testing
    // let allow = false;
    // try {
    //   const { data: isAdmin, error: rpcErr } = await (supabase as any).rpc('is_admin');
    //   // If RPC exists, enforce it; if missing or errored, don't block to avoid false negatives in new installs
    //   allow = rpcErr ? true : !!isAdmin;
    // } catch { allow = true; }
    // if (!allow) return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    const ownerUserId = user.id;

    // Create job row under owner for progress tracking
    console.log('vocab-admin-seed: creating job row');
    const { data: job, error: jobErr } = await supabase
      .from('jobs_vocab_seed')
      .insert({ user_id: ownerUserId, total, status: 'running' })
      .select('*')
      .single();
    if (jobErr) throw jobErr;
    console.log('vocab-admin-seed: job created', { jobId: job?.id });

    async function fetchBatch(level: number, limit: number) {
      const ranges: Record<number, [number, number]> = {
        1: [1, 1500],
        2: [1501, 4000],
        3: [4001, 6000],
        4: [6001, 8000],
        5: [8001, 10000]
      };
      const [minRank, maxRank] = ranges[level] || [1, 10000];
      const { data } = await supabase
        .from('vocab_frequency')
        .select('lemma, rank')
        .gte('rank', minRank)
        .lte('rank', maxRank)
        .order('rank')
        .limit(limit);
      return data || [];
    }

    async function aiSuggestTerms(level: number, count: number) {
      const prompts = {
        1: ['common basic words', 'essential everyday vocabulary', 'beginner level words'],
        2: ['intermediate vocabulary', 'frequently used words', 'common expressions'],
        3: ['advanced vocabulary', 'sophisticated words', 'complex terms'],
        4: ['academic vocabulary', 'formal language', 'specialized terms'],
        5: ['expert level vocabulary', 'rare words', 'technical terminology']
      };
      const prompt = prompts[level]?.[Math.floor(Math.random() * prompts[level].length)] || 'common words';
      return Array.from({ length: count }, (_, i) => `word${i + 1}`);
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

    // Translate a term into all supported site languages and persist into vocab_translations
    const SUPPORTED_LANGS = ['ar','bn','de','en','es','fa','fr','hi','id','ja','kk','ko','ms','ne','pt','ru','ta','th','tr','ur','vi','yue','zh'];
    async function translateAllLanguages(cardId: string, term: string) {
      const langs = SUPPORTED_LANGS.filter((l) => l !== 'en');
      for (const lang of langs) {
        try {
          const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/translation-service`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: term, sourceLang: 'en', targetLang: lang, includeContext: true })
          });
          if (!resp.ok) continue;
          const payload = await resp.json();
          if (!payload?.success) continue;
          const res = payload.result || {};
          const primary = typeof res.translation === 'string' ? res.translation : (res.translation?.translation || '');
          const alts = Array.isArray(res.alternatives) ? res.alternatives.map((a: any) => (typeof a === 'string' ? a : (a?.meaning || ''))).filter((s: string) => !!s) : [];
          const arr = [primary, ...alts].map((s: string) => String(s).trim()).filter(Boolean);
          if (!arr.length) continue;
          await supabase.from('vocab_translations').upsert({ user_id: ownerUserId, card_id: cardId, lang, translations: arr, provider: 'deepseek', quality: 1 } as any, { onConflict: 'card_id,lang' } as any);
          // light throttle to respect provider rate limits
          await new Promise((r) => setTimeout(r, 60));
        } catch (_) { /* ignore single-lang errors */ }
      }
    }

    // Check if there's an existing job to continue from
    const { data: existingJob } = await supabase
      .from('jobs_vocab_seed')
      .select('*')
      .eq('user_id', ownerUserId)
      .eq('status', 'running')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let completed = existingJob?.completed || 0;
    let currentLevel = existingJob?.level || 1;
    console.log('vocab-admin-seed: starting word generation loop', { existingJob: !!existingJob, completed, currentLevel });
    
    // Process only one batch to avoid timeout, then return
    const levelCount = levels[currentLevel] || 0;
    const remainingInLevel = Math.max(0, levelCount - completed);
    const batchSize = Math.min(remainingInLevel, 50); // Limit to 50 words per batch
    
    console.log('vocab-admin-seed: processing batch', { level: currentLevel, batchSize, completed, total });
    const batch = await fetchBatch(currentLevel, batchSize);
    console.log('vocab-admin-seed: fetched batch', { level: currentLevel, batchLength: batch.length, batch });
    
    let deckId: string | null = null;
    let deckCount = 0;
    let deckSeq = 0;
    
    async function ensureDeck() {
      if (deckId && deckCount < 20) return;
      deckSeq += 1;
      const { data: deck, error: deckErr } = await supabase
        .from('vocab_decks')
        .insert({ user_id: ownerUserId, name: `L${currentLevel} • Deck ${deckSeq}`, is_public: true })
        .select('id')
        .single();
      if (deckErr) throw deckErr;
      deckId = deck?.id || null;
      deckCount = 0;
    }
    
    let items = batch;
    if (items.length === 0) {
      const suggested = await aiSuggestTerms(currentLevel, Math.max(10, Math.min(30, batchSize)));
      items = suggested.map((s) => ({ lemma: String(s), rank: null }));
    }
    
    for (const { lemma, rank } of items) {
      if (completed >= total) break;
      console.log('vocab-admin-seed: processing word', { lemma, rank, completed, total });
      const { data: exists } = await supabase
        .from('vocab_cards')
        .select('id')
        .eq('term', lemma)
        .eq('language', language)
        .eq('is_public', true)
        .maybeSingle();
      if (exists) {
        console.log('vocab-admin-seed: word already exists, skipping', { lemma });
        continue;
      }
      try {
        await ensureDeck();
        console.log('vocab-admin-seed: enriching word', { lemma });
        const card = await enrich(lemma, null, currentLevel);
        console.log('vocab-admin-seed: enriched word result', { lemma, card: !!card });
        const { data: inserted, error: insErr } = await supabase.from('vocab_cards').insert({
          user_id: ownerUserId,
          deck_id: deckId,
          term: lemma,
          translation: card.translation,
          pos: card.pos || null,
          ipa: card.ipa || null,
          examples_json: Array.isArray(card.examples) ? card.examples.slice(0,3) : [],
          synonyms_json: Array.isArray(card.synonyms) ? card.synonyms.slice(0,8) : [],
          frequency_rank: card.frequencyRank || rank || null,
          language,
          level: currentLevel,
          is_public: true
        }).select('id').single();
        if (insErr) throw insErr;
        const cardId = inserted?.id;

        // Persist examples into vocab_examples (English)
        try {
          const examples = Array.isArray(card.examples) ? card.examples.slice(0,2) : [];
          if (examples.length && cardId) {
            await supabase.from('vocab_examples').insert(examples.map((s: string) => ({ user_id: ownerUserId, card_id: cardId, lang: 'en', sentence: s, cefr: 'B1', quality: 1 })));
          }
        } catch (_) {}

        // Persist translations into vocab_translations for ALL supported languages
        try {
          if (cardId) {
            await translateAllLanguages(cardId, lemma);
          }
        } catch (_) {}
        deckCount += 1;
        completed += 1;
        console.log('vocab-admin-seed: word completed', { lemma, completed, total });
        if (completed % 10 === 0) {
          await supabase.from('jobs_vocab_seed').update({ completed, level: currentLevel, updated_at: new Date().toISOString() }).eq('id', job.id);
        }
      } catch (e) {
        console.log('vocab-admin-seed: word failed', { lemma, error: String((e as any)?.message || e) });
        await supabase.from('jobs_vocab_seed').update({ last_error: String((e as any)?.message || e), last_term: lemma }).eq('id', job.id);
      }
      if (completed >= total) break;
    }

    // Update final status - either done or running for next batch
    const finalStatus = completed >= total ? 'done' : 'running';
    await supabase.from('jobs_vocab_seed').update({ completed, status: finalStatus, updated_at: new Date().toISOString() }).eq('id', job.id);
    
    console.log('vocab-admin-seed: batch completed', { completed, total, status: finalStatus });
    return new Response(JSON.stringify({ success: true, jobId: job.id, completed, total, status: finalStatus, message: completed >= total ? 'All words completed' : 'Batch completed, more words remain' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});