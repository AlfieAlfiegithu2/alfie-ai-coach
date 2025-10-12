// Deno Edge Function environment
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ImportRow = Record<string, string>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvText, delimiter = ",", previewOnly = false } = await req.json();
    if (!csvText || typeof csvText !== "string") {
      throw new Error("csvText is required");
    }

    // Parse CSV (simple, supports quoted values)
    const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    if (lines.length < 2) throw new Error("CSV must contain header and at least one row");

    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];
        if (ch === '"') {
          if (inQuotes && next === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === delimiter && !inQuotes) {
          out.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
      out.push(current);
      return out.map((s) => s.trim());
    };

    const headers = parseLine(lines[0]).map((h) => h.trim());
    // Expect: word and language columns (e.g., en, ko, ja ...)
    const wordIdx = headers.findIndex((h) => h.toLowerCase() === "word");
    if (wordIdx === -1) throw new Error("CSV must include a 'word' column");

    // Check if this is simple format (just English) or multi-language format
    const enIdx = headers.findIndex((h) => h.toLowerCase() === "en");

    let rows: ImportRow[] = [];
    if (enIdx !== -1) {
      // Simple format: just English words with examples
      for (let i = 1; i < lines.length; i++) {
        const vals = parseLine(lines[i]);
        if (!vals[wordIdx] || !vals[enIdx]) continue;
        const word = vals[wordIdx];
        const english = vals[enIdx];
        if (english && english.length > 0) {
          rows.push({ word, language_code: 'en', translation: english });
        }
      }
    } else {
      // Multi-language format (legacy)
      const langCols = headers
        .map((h, idx) => ({ h, idx }))
        .filter(({ h }) => h.toLowerCase() !== "word" && /^[a-z]{2}(-[a-z]{2})?$/i.test(h))
        .map(({ h, idx }) => ({ code: h.toLowerCase(), idx }));

      if (langCols.length === 0) throw new Error("CSV must include at least one language column like 'ko', 'ja', 'vi', 'zh', 'es'");

      for (let i = 1; i < lines.length; i++) {
        const vals = parseLine(lines[i]);
        if (!vals[wordIdx]) continue;
        const word = vals[wordIdx];
        for (const { code, idx } of langCols) {
          const translation = vals[idx];
          if (translation && translation.length > 0) {
            rows.push({ word, language_code: code, translation });
          }
        }
      }
    }

    if (previewOnly) {
      return new Response(JSON.stringify({ success: true, preview: rows.slice(0, 100), totalRows: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert into vocab_cards instead of vocabulary_words for proper level handling
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing environment variables:", { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey });
      throw new Error("Missing service role configuration");
    }

    // Group rows by word - for simple CSV with just English data
    const wordGroups = new Map();
    rows.forEach(row => {
      if (!wordGroups.has(row.word)) {
        wordGroups.set(row.word, { word: row.word, english: row.translation });
      }
    });

    // Convert to vocab_cards format with proper level detection
    const cardsToInsert = Array.from(wordGroups.values()).map(group => {
      const level = detectLevelFromFrequency(group.word);
      return {
        user_id: 'system', // System import
        deck_id: null, // Will be assigned later
        term: group.word,
        translation: group.english || '',
        pos: detectPartOfSpeech(group.word),
        ipa: generateIPA(group.word),
        context_sentence: generateContextSentence(group.word),
        examples_json: generateExamples(group.word),
        frequency_rank: estimateFrequencyRank(group.word, level),
        language: 'en',
        level: level,
        is_public: true
      };
    });

    // Batch insert cards
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < cardsToInsert.length; i += batchSize) {
      const batch = cardsToInsert.slice(i, i + batchSize);

      // Create a deck for this batch using direct database insert
      const deckData = {
        user_id: 'system',
        name: `Imported Level ${batch[0]?.level || 1} (${new Date().toISOString().slice(0, 10)})`,
        is_public: true
      };

      const { data: deck, error: deckError } = await (supabase as any)
        .from('vocab_decks')
        .insert(deckData)
        .select('id')
        .single();

      if (deckError || !deck?.id) {
        console.error('Deck creation failed:', deckError);
        throw new Error('Failed to create deck');
      }

      // Update cards with deck_id
      const cardsWithDeck = batch.map(card => ({ ...card, deck_id: deck.id }));

      const { error: cardError } = await (supabase as any)
        .from('vocab_cards')
        .insert(cardsWithDeck);

      if (cardError) {
        console.error('Card insertion failed:', cardError);
        throw new Error(`Card insert failed: ${cardError.message}`);
      }

      inserted += batch.length;

      // Queue translations for the inserted cards
      // Since we're using batch insert, we need to get the inserted cards back
      const { data: insertedCards, error: selectError } = await (supabase as any)
        .from('vocab_cards')
        .select('id, term')
        .eq('deck_id', deck.id)
        .order('created_at', { ascending: false })
        .limit(batch.length);

      if (selectError || !insertedCards) {
        console.error('Failed to retrieve inserted cards:', selectError);
        // Continue anyway, translations will be processed later
      } else {
        await queueTranslationsForImport(insertedCards);

        // Process some translations immediately
        try {
          // Call process-translations function via HTTP
          const processResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-translations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({}),
          });

          if (!processResp.ok) {
            console.log('Background translation processing request failed:', processResp.status);
          }
        } catch (error) {
          console.log('Background translation processing failed:', error);
          // Don't fail the import if background processing fails
        }
      }
    }

    return new Response(JSON.stringify({ success: true, inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// Helper functions for vocabulary import
function detectLevelFromFrequency(word: string): number {
  // Simple heuristic based on word complexity
  const complexWords = ['epistemological', 'hermeneutics', 'phenomenological', 'dialectical', 'existential'];
  const advancedWords = ['sophisticated', 'methodology', 'infrastructure', 'paradigm', 'hypothesis'];
  const intermediateWords = ['environment', 'technology', 'communication', 'education', 'government'];

  if (complexWords.some(w => word.toLowerCase().includes(w))) return 5;
  if (advancedWords.some(w => word.toLowerCase().includes(w))) return 4;
  if (intermediateWords.some(w => word.toLowerCase().includes(w))) return 3;

  // Default to level 2 for common words
  return 2;
}

function detectPartOfSpeech(word: string): string {
  // Simple POS detection based on common patterns
  if (word.endsWith('ing')) return 'verb';
  if (word.endsWith('ed')) return 'verb';
  if (word.endsWith('er') || word.endsWith('est')) return 'adjective';
  if (word.endsWith('ly')) return 'adverb';
  if (word.endsWith('tion') || word.endsWith('ment') || word.endsWith('ness')) return 'noun';

  return 'noun'; // Default
}

function generateIPA(word: string): string {
  // Very basic IPA generation - in reality you'd want a proper IPA library
  const simpleIPAMap: Record<string, string> = {
    'house': '/haʊs/',
    'water': '/ˈwɔːtər/',
    'environment': '/ɪnˈvaɪrənmənt/',
    'sophisticated': '/səˈfɪstɪkeɪtɪd/',
    'epistemological': '/ɪˌpɪstəməˈlɒdʒɪkəl/'
  };

  return simpleIPAMap[word.toLowerCase()] || `/${word}/`;
}

function generateContextSentence(word: string): string {
  const contexts: Record<string, string> = {
    'house': 'The house has a beautiful garden in the backyard.',
    'water': 'I drink eight glasses of water every day.',
    'environment': 'We must protect the environment for future generations.',
    'sophisticated': 'Her sophisticated analysis impressed the committee.',
    'epistemological': 'The epistemological foundations of the theory are sound.'
  };

  return contexts[word.toLowerCase()] || `This ${word} is important for learning.`;
}

function generateExamples(word: string): string[] {
  const examples: Record<string, string[]> = {
    'house': [
      'I need to clean my house before guests arrive.',
      'We bought a new house in the suburbs.',
      'The house has three bedrooms and two bathrooms.'
    ],
    'water': [
      'The water in this lake is very clean.',
      'Please pass me a bottle of water.',
      'Plants need water to grow properly.'
    ],
    'environment': [
      'The company is committed to environmental sustainability.',
      'Environmental issues are becoming increasingly important.',
      'We should all work to protect our environment.'
    ]
  };

  return examples[word.toLowerCase()] || [
    `I use ${word} every day.`,
    `The ${word} is very important.`,
    `Many people study ${word}.`
  ];
}

function estimateFrequencyRank(word: string, level: number): number {
  // Estimate frequency rank based on level
  const baseRanks = {
    1: 100,    // Most common
    2: 2000,   // Common
    3: 5000,   // Intermediate
    4: 8000,   // Advanced
    5: 9500    // Most advanced
  };

  return baseRanks[level] + Math.floor(Math.random() * 500);
}

async function queueTranslationsForImport(insertedCards: any[]) {
  // Queue translations for the imported cards
  for (const card of insertedCards) {
    try {
      // Create translation jobs for all supported languages except English
      const languages = ['ko', 'ja', 'zh', 'es', 'fr', 'de', 'ar', 'hi', 'pt', 'ru', 'th', 'vi', 'tr', 'ur', 'yue', 'bn', 'fa', 'id', 'ms', 'ne', 'ta'];

      for (const lang of languages) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/vocab_translation_queue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            user_id: 'system',
            card_id: card.id,
            term: card.term,
            target_lang: lang,
            status: 'pending'
          }),
        });
      }
    } catch (error) {
      console.error(`Failed to queue translations for ${card.term}:`, error);
    }
  }
}