import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ImportRow = {
  word: string;
  en: string;
  pos?: string;
  ipa?: string;
  frequency_rank?: number | null;
  level?: number | null;
  context_sentence?: string;
  example_1?: string;
  example_2?: string;
  example_3?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const body = await req.json().catch(() => ({}));
    const csvUrl: string | undefined = body?.csvUrl || Deno.env.get('CEFR_CSV_URL') || undefined;
    const total: number = Math.min(Number(body?.total || 8000), 20000);
    const batchSize: number = Math.min(Math.max(Number(body?.batchSize || 400), 50), 500);

    if (!csvUrl) {
      throw new Error('Missing CEFR CSV URL. Provide body.csvUrl or set CEFR_CSV_URL environment variable to a public RAW CSV URL.');
    }

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Auto-resume: find highest frequency_rank we've already imported
    const { data: maxRankRow } = await supabase
      .from('vocab_cards')
      .select('frequency_rank')
      .eq('is_public', true)
      .eq('language', 'en')
      .not('frequency_rank', 'is', null)
      .order('frequency_rank', { ascending: false })
      .limit(1)
      .maybeSingle();

    const startFromRank = (maxRankRow?.frequency_rank ?? 0) + 1;

    // Fetch CSV
    const resp = await fetch(csvUrl);
    if (!resp.ok) throw new Error(`Failed to fetch CEFR CSV: ${resp.status}`);
    const csvText = await resp.text();

    // Parse CSV (supports quotes)
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error('Empty CEFR CSV');

    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const nx = line[i + 1];
        if (ch === '"') {
          if (inQuotes && nx === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur); cur = '';
        } else { cur += ch; }
      }
      out.push(cur);
      return out.map(s => s.trim());
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase());
    const idx = (name: string) => headers.findIndex(h => h === name);
    const wordIdx = idx('word');
    const enIdx = idx('en');
    if (wordIdx === -1 || enIdx === -1) throw new Error("CSV must include 'word' and 'en' headers");

    const posIdx = idx('pos');
    const ipaIdx = idx('ipa');
    const freqIdx = idx('frequency_rank');
    const levelIdx = idx('level');
    const ctxIdx = idx('context_sentence');
    const ex1Idx = idx('example_1');
    const ex2Idx = idx('example_2');
    const ex3Idx = idx('example_3');

    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length && rows.length < total; i++) {
      const vals = parseLine(lines[i]);
      const word = vals[wordIdx];
      const en = vals[enIdx];
      if (!word || !en) continue;
      const freq = freqIdx >= 0 ? Number(vals[freqIdx]) : NaN;
      if (Number.isFinite(freq) && freq < startFromRank) continue; // resume
      rows.push({
        word,
        en,
        pos: posIdx >= 0 ? vals[posIdx] : undefined,
        ipa: ipaIdx >= 0 ? vals[ipaIdx] : undefined,
        frequency_rank: Number.isFinite(freq) ? freq : null,
        level: levelIdx >= 0 && Number.isFinite(Number(vals[levelIdx])) ? Number(vals[levelIdx]) : null,
        context_sentence: ctxIdx >= 0 ? vals[ctxIdx] : undefined,
        example_1: ex1Idx >= 0 ? vals[ex1Idx] : undefined,
        example_2: ex2Idx >= 0 ? vals[ex2Idx] : undefined,
        example_3: ex3Idx >= 0 ? vals[ex3Idx] : undefined,
      });
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: true, importedCount: 0, isResume: true, startedFromRank: startFromRank, message: 'No new rows after resume point' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Insert in batches; de-dupe by term (case-insensitive)
    let imported = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const terms = batch.map(r => r.word.toLowerCase());
      const { data: existing } = await supabase
        .from('vocab_cards')
        .select('term')
        .eq('language', 'en')
        .eq('is_public', true)
        .in('term', terms);

      const exists = new Set((existing || []).map((e: any) => String(e.term).toLowerCase()));
      const toInsert = batch.filter(r => !exists.has(r.word.toLowerCase())).map(r => ({
        user_id: user.id,
        deck_id: null,
        term: r.word,
        translation: r.en || '',
        pos: r.pos || null,
        ipa: r.ipa || null,
        context_sentence: r.context_sentence || null,
        examples_json: [r.example_1, r.example_2, r.example_3].filter(Boolean),
        frequency_rank: r.frequency_rank ?? null,
        language: 'en',
        level: r.level ?? null,
        is_public: true,
      }));

      if (!toInsert.length) continue;

      // Create a deck for grouping
      const { data: deck } = await supabase
        .from('vocab_decks')
        .insert({ user_id: user.id, name: `CEFR Import • ${new Date().toISOString().slice(0,10)}`, is_public: true })
        .select('id')
        .maybeSingle();

      const withDeck = toInsert.map(c => ({ ...c, deck_id: deck?.id || null }));
      const { error: insErr } = await supabase.from('vocab_cards').insert(withDeck);
      if (insErr) throw new Error(insErr.message);
      imported += withDeck.length;
    }

    return new Response(JSON.stringify({
      success: true,
      importedCount: imported,
      isResume: startFromRank > 1,
      startedFromRank: startFromRank,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


