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
    const minLevel = Number(body?.minLevel || 1);
    const maxLevel = Number(body?.maxLevel || 5);
    const languages = body?.languages || ['ko', 'ja', 'zh', 'es', 'fr', 'de'];
    const batchSize = 50; // Process 50 words at a time (faster processing)
    
    // Auto-calculate starting rank based on minLevel if not specified
    const defaultStartRank = minLevel === 1 ? 0 :
                            minLevel === 2 ? 1000 :
                            minLevel === 3 ? 2000 :
                            minLevel === 4 ? 4000 : 7000;
    
    // Check if user wants to resume from where they left off
    // If startRank is not provided, check the highest frequency_rank in the requested level range
    let startRank = defaultStartRank;
    
    if (!body?.startRank && body?.startRank !== 0) {
      console.log('No explicit startRank provided, checking for existing words to resume...');
      
      // Find the highest frequency rank in the target level range to continue from there
      const { data: highestRankCard } = await supabase
        .from('vocab_cards')
        .select('frequency_rank, term')
        .eq('is_public', true)
        .gte('level', minLevel)
        .lte('level', maxLevel)
        .not('frequency_rank', 'is', null)
        .order('frequency_rank', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (highestRankCard?.frequency_rank) {
        // Resume from next rank after the highest we have
        startRank = highestRankCard.frequency_rank + 1;
        console.log(`Found existing words up to rank ${highestRankCard.frequency_rank} (term: "${highestRankCard.term}")`);
        console.log(`Resuming from rank ${startRank} to continue generating more advanced words`);
      } else {
        console.log(`No existing words found for levels ${minLevel}-${maxLevel}, starting from default rank ${defaultStartRank}`);
      }
    } else {
      startRank = Number(body.startRank);
      console.log(`Using explicit startRank: ${startRank}`);
    }

    console.log(`Fetching real English frequency list...`);
    
    // Fetch real word list
    const listResp = await fetch(FREQUENCY_LIST_URL);
    if (!listResp.ok) throw new Error('Failed to fetch frequency list');
    const listText = await listResp.text();
    const allWords = listText.trim().split('\n')
      .filter(w => w.length > 1)  // Filter out single letters
      .filter(w => /^[a-z]+$/.test(w));  // Only alphabetic words

    // Take requested slice
    const targetWords = allWords.slice(startRank, startRank + total);
    console.log(`Processing ${targetWords.length} real words (rank ${startRank + 1} to ${startRank + targetWords.length}) for levels ${minLevel}-${maxLevel}`);

    let inserted = 0;
    let skipped = 0;
    const batches = Math.ceil(targetWords.length / batchSize);

    // Create deck with level information
    const deckName = minLevel === maxLevel 
      ? `Level ${minLevel} • Rank ${startRank + 1}-${startRank + targetWords.length}`
      : `Levels ${minLevel}-${maxLevel} • Rank ${startRank + 1}-${startRank + targetWords.length}`;
    
    const { data: deck } = await supabase
      .from('vocab_decks')
      .insert({ 
        user_id: user.id, 
        name: deckName,
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

      // Insert cards with proper level, skip if outside level range
      const cardsWithLevels = enrichedWords.map((w, idx) => {
        const calculatedLevel = calculateLevel(startRank + b * batchSize + idx);
        return { ...w, calculatedLevel, idx };
      });
      
      const cardsToInsert = cardsWithLevels
        .filter(w => {
          const inRange = w.calculatedLevel >= minLevel && w.calculatedLevel <= maxLevel;
          if (!inRange) {
            skipped++;
            console.log(`Skipping "${w.term}" - Level ${w.calculatedLevel} outside range ${minLevel}-${maxLevel}`);
          }
          return inRange;
        })
        .map(w => {
          console.log(`Including "${w.term}" - Rank: ${w.frequencyRank}, Level: ${w.calculatedLevel}`);
          return {
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
            level: w.calculatedLevel,
            is_public: true
          };
        });

      if (cardsToInsert.length === 0) {
        console.log(`Batch ${b + 1}/${batches}: No words in level range ${minLevel}-${maxLevel}, skipping`);
        continue;
      }

      // Check for existing words to avoid duplicates
      const termsToCheck = cardsToInsert.map(c => c.term.toLowerCase());
      const { data: existingCards } = await supabase
        .from('vocab_cards')
        .select('term')
        .eq('is_public', true)
        .in('term', termsToCheck);
      
      const existingTerms = new Set(
        (existingCards || []).map((c: any) => c.term.toLowerCase())
      );
      
      const newCards = cardsToInsert.filter(c => !existingTerms.has(c.term.toLowerCase()));
      const duplicateCount = cardsToInsert.length - newCards.length;
      
      if (duplicateCount > 0) {
        console.log(`Batch ${b + 1}/${batches}: Skipping ${duplicateCount} duplicate words`);
      }
      
      if (newCards.length === 0) {
        console.log(`Batch ${b + 1}/${batches}: All words already exist, skipping insertion`);
        continue;
      }

      const { data: insertedCards, error: insertErr } = await supabase
        .from('vocab_cards')
        .insert(newCards)
        .select('id, term');

      if (insertErr) {
        console.error('Insert error:', insertErr);
        // Log but don't fail - might be race condition with unique constraint
        console.log(`Insert error (possibly duplicate): ${insertErr.message}`);
        continue;
      }

      inserted += newCards.length;

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

      // Minimal delay between batches (reduced from 300ms to 50ms for faster processing)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Calculate if this was a resume or fresh start
    const isResume = startRank > defaultStartRank;
    const baseMessage = isResume 
      ? `✅ Resumed generation from rank ${startRank}! Imported ${inserted} more advanced words`
      : `✅ Successfully imported ${inserted} words`;
    
    const message = skipped > 0 
      ? `${baseMessage} (${skipped} skipped as outside level range ${minLevel}-${maxLevel})`
      : baseMessage;
    
    return new Response(JSON.stringify({
      success: true,
      message,
      importedCount: inserted,
      skippedCount: skipped,
      levelRange: `${minLevel}-${maxLevel}`,
      rankRange: `${startRank + 1}-${startRank + targetWords.length}`,
      isResume: isResume,
      startedFromRank: startRank,
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
