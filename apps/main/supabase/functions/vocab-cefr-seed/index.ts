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

function normalizeTerm(s: string): string {
  return (s || '').trim().toLowerCase();
}

function mapCEFRLabelToLevel(label?: string): number | null {
  if (!label) return null;
  const L = label.trim().toUpperCase();
  if (L === 'A1') return 1;
  if (L === 'A2') return 2;
  if (L === 'B1') return 3;
  if (L === 'B2') return 4;
  if (L === 'C1' || L === 'C2') return 5;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    console.log('🚀 vocab-cefr-seed: Starting...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      throw new Error('Unauthorized');
    }
    console.log('✓ Authorization header present');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const body = await req.json().catch(() => ({}));
    const defaultCEFR = 'https://huggingface.co/spaces/nontgcob/T2E_Vocabulary_Exam_Generator/resolve/b420ca4bc1b0423aa5fd4d94df1e0f0a100564e8/cefr-vocab.csv';
    const csvUrl: string = body?.csvUrl || Deno.env.get('CEFR_CSV_URL') || defaultCEFR;
    const total: number = Math.min(Number(body?.total || 8000), 20000);
    const batchSize: number = Math.min(Math.max(Number(body?.batchSize || 400), 50), 500);
    const targetLevel: number | null = body?.level !== undefined ? Number(body.level) : null; // For .txt imports

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated');
      throw new Error('Unauthorized');
    }
    console.log('✓ User authenticated:', user.id);

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
    console.log(`📊 Resume from rank: ${startFromRank}`);

    // Fetch data
    console.log(`📥 Fetching CSV from: ${csvUrl}`);
    const resp = await fetch(csvUrl, { headers: { 'Accept': 'text/csv, text/plain;q=0.9, */*;q=0.8' } });
    if (!resp.ok) {
      console.error(`❌ CSV fetch failed with status ${resp.status}`);
      throw new Error(`Failed to fetch CEFR source: ${resp.status}`);
    }
    console.log('✓ CSV fetched successfully');
    const sourceText = await resp.text();
    console.log(`✓ CSV parsed, length: ${sourceText.length} characters`);

    // If plain TXT list (e.g., GitHub B2.txt, C1.txt), treat each non-empty line as a word at specified level
    if (csvUrl.toLowerCase().endsWith('.txt')) {
      console.log(`📝 Processing TXT file, target level: ${targetLevel || 'auto-detect'}`);
      
      // Auto-detect level from URL if not specified
      let detectedLevel = targetLevel;
      if (detectedLevel === null) {
        const urlLower = csvUrl.toLowerCase();
        if (urlLower.includes('c1') || urlLower.includes('/c1.txt')) detectedLevel = 5;
        else if (urlLower.includes('c2') || urlLower.includes('/c2.txt')) detectedLevel = 5;
        else if (urlLower.includes('b2') || urlLower.includes('/b2.txt')) detectedLevel = 4;
        else if (urlLower.includes('b1') || urlLower.includes('/b1.txt')) detectedLevel = 3;
        else if (urlLower.includes('a2') || urlLower.includes('/a2.txt')) detectedLevel = 2;
        else if (urlLower.includes('a1') || urlLower.includes('/a1.txt')) detectedLevel = 1;
        else detectedLevel = 4; // Default to B2
      }
      console.log(`✓ Using level ${detectedLevel} for TXT import`);
      
      const lines = sourceText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const rows: ImportRow[] = [];
      const seen = new Set<string>();
      for (const w of lines) {
        const norm = normalizeTerm(w);
        if (!norm || seen.has(norm)) continue;
        seen.add(norm);
        rows.push({ word: w, en: w, level: detectedLevel });
        if (rows.length >= total) break;
      }
      console.log(`✓ Parsed ${rows.length} unique words from TXT`);

      // Insert using common batching logic
      let imported = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const originalTerms = batch.map(r => r.word);
        const { data: existingRaw } = await supabase
          .from('vocab_cards')
          .select('term')
          .eq('language', 'en')
          .eq('is_public', true)
          .in('term', originalTerms);

        const dbExisting = new Set<string>((existingRaw || []).map((e: any) => normalizeTerm(e.term)));
        const toInsert = batch.filter(r => !dbExisting.has(normalizeTerm(r.word))).map(r => ({
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

        const { data: deck } = await supabase
          .from('vocab_decks')
          .insert({ user_id: user.id, name: `CEFR Import • ${new Date().toISOString().slice(0,10)}`, is_public: true })
          .select('id')
          .maybeSingle();
        const withDeck = toInsert.map(c => ({ ...c, deck_id: deck?.id || null }));

        // Try bulk insert; on duplicate constraint, fallback to per-row
        const bulk = await supabase.from('vocab_cards').insert(withDeck);
        if (bulk.error) {
          const msg = String(bulk.error.message || '');
          if (msg.includes('duplicate key') || bulk.error.code === '23505') {
            for (const c of withDeck) {
              const one = await supabase.from('vocab_cards').insert(c);
              if (one.error) {
                const m = String(one.error.message || '');
                if (m.includes('duplicate key') || one.error.code === '23505') continue;
                throw new Error(one.error.message);
              }
              imported += 1;
            }
          } else {
            throw new Error(bulk.error.message);
          }
        } else {
          imported += withDeck.length;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        importedCount: imported,
        isResume: startFromRank > 1,
        startedFromRank: startFromRank,
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Parse CSV (supports quotes)
    const lines = sourceText.split(/\r?\n/).filter(l => l.trim().length > 0);
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
    let wordIdx = idx('word');
    if (wordIdx === -1) wordIdx = idx('headword');
    let enIdx = idx('en');
    if (wordIdx === -1) throw new Error("CSV must include 'word' or 'headword' header");

    const posIdx = idx('pos');
    const ipaIdx = idx('ipa');
    const freqIdx = idx('frequency_rank');
    const levelIdx = idx('level');
    const cefrIdx = levelIdx === -1 ? idx('cefr') : -1;
    const ctxIdx = idx('context_sentence');
    const ex1Idx = idx('example_1');
    const ex2Idx = idx('example_2');
    const ex3Idx = idx('example_3');

    const rows: ImportRow[] = [];
    const seen = new Set<string>();
    for (let i = 1; i < lines.length && rows.length < total; i++) {
      const vals = parseLine(lines[i]);
      const word = vals[wordIdx];
      const en = enIdx >= 0 ? vals[enIdx] : word; // fallback if 'en' missing
      if (!word || !en) continue;
      const norm = normalizeTerm(word);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      const freq = freqIdx >= 0 ? Number(vals[freqIdx]) : NaN;
      if (Number.isFinite(freq) && freq < startFromRank) continue; // resume
      rows.push({
        word,
        en,
        pos: posIdx >= 0 ? vals[posIdx] : undefined,
        ipa: ipaIdx >= 0 ? vals[ipaIdx] : undefined,
        frequency_rank: Number.isFinite(freq) ? freq : null,
        level: levelIdx >= 0 && Number.isFinite(Number(vals[levelIdx])) ? Number(vals[levelIdx]) : (cefrIdx >= 0 ? mapCEFRLabelToLevel(vals[cefrIdx]) : null),
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

      const originalTerms = batch.map(r => r.word);
      const { data: existingRaw } = await supabase
        .from('vocab_cards')
        .select('term')
        .eq('language', 'en')
        .eq('is_public', true)
        .in('term', originalTerms);

      const dbExisting = new Set((existingRaw || []).map((e: any) => normalizeTerm(e.term)));
      const toInsert = batch.filter(r => !dbExisting.has(normalizeTerm(r.word))).map(r => ({
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
      // Try bulk insert; on duplicate constraint, fallback to per-row
      const bulk = await supabase.from('vocab_cards').insert(withDeck);
      if (bulk.error) {
        const msg = String(bulk.error.message || '');
        if (msg.includes('duplicate key') || bulk.error.code === '23505') {
          for (const c of withDeck) {
            const one = await supabase.from('vocab_cards').insert(c);
            if (one.error) {
              const m = String(one.error.message || '');
              if (m.includes('duplicate key') || one.error.code === '23505') continue;
              throw new Error(one.error.message);
            }
            imported += 1;
          }
        } else {
          throw new Error(bulk.error.message);
        }
      } else {
        imported += withDeck.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      importedCount: imported,
      isResume: startFromRank > 1,
      startedFromRank: startFromRank,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    const errorMsg = String((e as any).message || e);
    console.error('❌ vocab-cefr-seed error:', errorMsg);
    console.error('Stack:', (e as any).stack);
    return new Response(JSON.stringify({ success: false, error: errorMsg }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


