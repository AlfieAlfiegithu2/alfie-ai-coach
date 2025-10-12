import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');

// Top 10000 most common English words from Google Trillion Word Corpus
const FREQUENCY_LIST_URL = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt';

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const body = await req.json().catch(() => ({}));
    const total = Math.min(Number(body?.total || 1000), 10000);
    const startRank = Math.max(Number(body?.startRank || 0), 0);
    const languages = body?.languages || ['ko', 'ja', 'zh', 'es', 'fr', 'de'];
    const batchSize = 20; // Process 20 words at a time

    console.log(`Fetching real English frequency list...`);
    
    // Fetch real word list
    const listResp = await fetch(FREQUENCY_LIST_URL);
    if (!listResp.ok) throw new Error('Failed to fetch frequency list');
    const listText = await listResp.text();
    const allWords = listText.trim().split('\n').filter(w => w.length > 0);

    // Take requested slice
    const targetWords = allWords.slice(startRank, startRank + total);
    console.log(`Processing ${targetWords.length} real words (rank ${startRank} to ${startRank + targetWords.length})`);

    let inserted = 0;
    const batches = Math.ceil(targetWords.length / batchSize);

    // Create deck
    const { data: deck } = await supabase
      .from('vocab_decks')
      .insert({ 
        user_id: user.id, 
        name: `Frequency ${startRank + 1}-${startRank + targetWords.length}`,
        is_public: true 
      })
      .select('id')
      .single();

    if (!deck?.id) throw new Error('Failed to create deck');

    for (let b = 0; b < batches; b++) {
      const batchWords = targetWords.slice(b * batchSize, (b + 1) * batchSize);
      console.log(`Batch ${b + 1}/${batches}: Processing ${batchWords.length} words`);

      const enrichedWords = await Promise.all(
        batchWords.map(async (word, idx) => {
          try {
            // Enrich with vocab-enrich
            const enrichResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/vocab-enrich`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                term: word,
                targetLanguage: 'en',
                nativeLanguage: languages[0] || 'en',
                level: calculateLevel(startRank + b * batchSize + idx)
              })
            });

            if (!enrichResp.ok) {
              console.log(`Failed to enrich ${word}, using basic data`);
              return {
                term: word,
                translation: '',
                ipa: null,
                pos: 'noun',
                examples: [],
                level: calculateLevel(startRank + b * batchSize + idx),
                frequencyRank: startRank + b * batchSize + idx + 1
              };
            }

            const enrichData = await enrichResp.json();
            const card = enrichData.card || {};

            return {
              term: word,
              translation: card.translation || '',
              ipa: card.ipa || null,
              pos: card.pos || 'noun',
              examples: card.examples || [],
              level: card.level || calculateLevel(startRank + b * batchSize + idx),
              frequencyRank: card.frequencyRank || (startRank + b * batchSize + idx + 1)
            };
          } catch (e) {
            console.log(`Error enriching ${word}:`, e);
            return {
              term: word,
              translation: '',
              ipa: null,
              pos: 'noun',
              examples: [],
              level: calculateLevel(startRank + b * batchSize + idx),
              frequencyRank: startRank + b * batchSize + idx + 1
            };
          }
        })
      );

      // Insert cards
      const cardsToInsert = enrichedWords.map(w => ({
        user_id: user.id,
        deck_id: deck.id,
        term: w.term,
        translation: w.translation,
        pos: w.pos,
        ipa: w.ipa,
        context_sentence: w.examples[0] || '',
        examples_json: w.examples.slice(0, 3).filter(Boolean),
        frequency_rank: w.frequencyRank,
        language: 'en',
        level: w.level,
        is_public: true
      }));

      const { data: insertedCards, error: insertErr } = await supabase
        .from('vocab_cards')
        .insert(cardsToInsert)
        .select('id, term');

      if (insertErr) {
        console.error('Insert error:', insertErr);
        throw new Error(`Insert failed: ${insertErr.message}`);
      }

      inserted += cardsToInsert.length;

      // Queue translations for key languages
      if (insertedCards && insertedCards.length && languages.length > 1) {
        const jobs = [];
        for (const card of insertedCards) {
          for (const lang of languages.slice(1)) { // Skip first lang (already enriched with it)
            jobs.push({
              user_id: user.id,
              card_id: card.id,
              term: card.term,
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
            await supabase.from('vocab_translation_queue').insert(chunk as any);
          }
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully seeded ${inserted} real English words from frequency list`,
      importedCount: inserted,
      deckId: deck.id
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('vocab-frequency-seed error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String((e as any).message || e) 
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});

function calculateLevel(rank: number): number {
  if (rank < 1000) return 1;      // A1 - most common
  if (rank < 2000) return 2;      // A2
  if (rank < 4000) return 3;      // B1
  if (rank < 7000) return 4;      // B2
  return 5;                       // C1/C2
}
