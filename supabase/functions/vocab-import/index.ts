// Deno Edge Function environment
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ImportRow = Record<string, string>;

type CardPayload = {
  user_id: string;
  deck_id: string | null;
  term: string;
  translation: string;
  pos?: string | null;
  ipa?: string | null;
  context_sentence?: string | null;
  examples_json?: string[] | null;
  frequency_rank?: number | null;
  language: string;
  level?: number | null;
  is_public: boolean;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvText: bodyCsvText, githubRawUrl, delimiter = ",", previewOnly = false, queueTranslations = false, languages, batchSize: batchSizeParam } = await req.json();

    let csvText = bodyCsvText;

    if ((!csvText || typeof csvText !== "string") && githubRawUrl) {
      const res = await fetch(githubRawUrl);
      if (!res.ok) throw new Error(`Failed to fetch CSV from GitHub URL (${res.status})`);
      csvText = await res.text();
    }

    if (!csvText || typeof csvText !== "string") {
      throw new Error("csvText is required (or provide githubRawUrl)");
    }

    // Robust CSV parsing with quoted values support
    const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    if (lines.length < 2) throw new Error("CSV must contain header and at least one row");

    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];
        if (ch === '"') {
          if (inQuotes && next === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === delimiter && !inQuotes) {
          out.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map(s => s.trim());
    };

    const headers = parseLine(lines[0]).map(h => h.trim());

    // Mandatory columns
    const wordIdx = headers.findIndex(h => h.toLowerCase() === 'word');
    const enIdx = headers.findIndex(h => h.toLowerCase() === 'en');
    if (wordIdx === -1) throw new Error("CSV must include a 'word' column");
    if (enIdx === -1) throw new Error("CSV must include an 'en' column for translation/meaning");

    // Optional columns
    const find = (name: string) => headers.findIndex(h => h.toLowerCase() === name);
    const posIdx = find('pos');
    const ipaIdx = find('ipa');
    const freqIdx = find('frequency_rank');
    const levelIdx = find('level');
    const contextIdx = find('context_sentence');
    const ex1Idx = find('example_1');
    const ex2Idx = find('example_2');
    const ex3Idx = find('example_3');

    const parsedRows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      const word = vals[wordIdx];
      const en = vals[enIdx];
      if (!word || !en) continue;
      parsedRows.push({
        word,
        en,
        pos: posIdx >= 0 ? vals[posIdx] : '',
        ipa: ipaIdx >= 0 ? vals[ipaIdx] : '',
        frequency_rank: freqIdx >= 0 ? vals[freqIdx] : '',
        level: levelIdx >= 0 ? vals[levelIdx] : '',
        context_sentence: contextIdx >= 0 ? vals[contextIdx] : '',
        example_1: ex1Idx >= 0 ? vals[ex1Idx] : '',
        example_2: ex2Idx >= 0 ? vals[ex2Idx] : '',
        example_3: ex3Idx >= 0 ? vals[ex3Idx] : '',
      });
    }

    if (previewOnly) {
      // Return a compact preview including examples count
      const preview = parsedRows.slice(0, 100).map(r => ({
        word: r.word,
        language_code: 'en',
        translation: r.en,
        pos: r.pos,
        ipa: r.ipa,
        level: r.level,
        frequency_rank: r.frequency_rank,
        examples: [r.example_1, r.example_2, r.example_3].filter(Boolean).length
      }));
      return new Response(JSON.stringify({ success: true, preview, totalRows: parsedRows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create Supabase clients
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) throw new Error('Missing Supabase configuration');

    // Get calling user from Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseAuthed = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await supabaseAuthed.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${SERVICE_KEY}` } }
    });

    // Build card payloads
    const cards: CardPayload[] = parsedRows.map((r) => {
      const examples = [r.example_1, r.example_2, r.example_3].filter(Boolean);
      const level = r.level ? Number(r.level) : undefined;
      const frequency_rank = r.frequency_rank ? Number(r.frequency_rank) : undefined;
      return {
        user_id: user.id,
        deck_id: null,
        term: r.word,
        translation: r.en || '',
        pos: r.pos || null,
        ipa: r.ipa || null,
        context_sentence: r.context_sentence || null,
        examples_json: examples.length ? examples : null,
        frequency_rank: Number.isFinite(frequency_rank) ? frequency_rank! : null,
        language: 'en',
        level: Number.isFinite(level) ? level! : null,
        is_public: true,
      };
    });

    // Process in batches and create a deck per level per batch for organization
    const batchSize = Math.min(Math.max(Number(batchSizeParam) || 200, 50), 500);
    let inserted = 0;

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const level = batch[0]?.level ?? 1;

      // Create a deck
      const { data: deck, error: deckError } = await supabase
        .from('vocab_decks')
        .insert({ user_id: user.id, name: `CSV Import Level ${level} - ${new Date().toISOString().slice(0,10)}`, is_public: true })
        .select('id')
        .maybeSingle();

      if (deckError || !deck?.id) {
        console.error('Deck creation failed:', deckError);
        throw new Error('Failed to create deck');
      }

      const withDeck = batch.map(c => ({ ...c, deck_id: deck.id }));
      const { data: insertedCards, error: insertErr } = await supabase
        .from('vocab_cards')
        .insert(withDeck)
        .select('id, term');
      if (insertErr) {
        console.error('Card insert error:', insertErr);
        throw new Error(`Card insert failed: ${insertErr.message}`);
      }

      inserted += withDeck.length;

      if (queueTranslations && insertedCards && insertedCards.length) {
        const langs = Array.isArray(languages) && languages.length ? languages : ['ko','ja','zh','es','fr','de'];
        await queueTranslationsJobs(supabase, insertedCards, user.id, langs);
        try {
          await supabase.functions.invoke('process-translations', { body: {} });
        } catch (_) {
          // ignore background failure
        }
      }
    }

    return new Response(JSON.stringify({ success: true, inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error('vocab-import error:', e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function queueTranslationsJobs(
  supabase: ReturnType<typeof createClient>,
  insertedCards: { id: string; term: string }[],
  userId: string,
  langs: string[]
) {
  const jobs: any[] = [];
  for (const c of insertedCards) {
    for (const lang of langs) {
      jobs.push({
        user_id: userId,
        card_id: c.id,
        term: c.term,
        target_lang: lang,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }
  }
  if (jobs.length) {
    const chunkSize = 1000;
    for (let i = 0; i < jobs.length; i += chunkSize) {
      const chunk = jobs.slice(i, i + chunkSize);
      const { error } = await supabase.from('vocab_translation_queue').insert(chunk as any);
      if (error) {
        console.log('translation queue insert error:', error.message);
        break;
      }
    }
  }
}
