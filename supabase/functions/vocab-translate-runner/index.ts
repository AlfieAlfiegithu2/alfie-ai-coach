import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Deno EdgeRuntime global is injected by Supabase; declare for TS
// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offset = 0, limit = 150, languages } = await req.json().catch(() => ({ offset: 0, limit: 150 }));

    // Optimized limits for faster processing
    const MAX_CARDS_PER_RUN = 20;
    const BATCH_SIZE = 8; // Words per API call
    const MAX_RETRIES = 3;
    const requestedLimit = typeof limit === 'number' && limit > 0 ? limit : 150;
    const effectiveLimit = Math.min(requestedLimit, MAX_CARDS_PER_RUN);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Supabase env' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const targetLangs: string[] = languages || ['ar','bn','de','es','fa','fr','hi','id','ja','kk','ko','ms','ne','pt','ru','ta','th','tr','ur','vi','yue','zh','zh-TW'];

    console.log(`Runner: fetching cards offset=${offset} limit=${effectiveLimit} (requested=${requestedLimit})`);

    // Optimized query: Only fetch cards that are missing translations for target languages
    let cards: any[] = [];
    const { data: fetchedCards, error: fetchErr } = await supabase.rpc('get_cards_needing_translation', {
      p_offset: offset,
      p_limit: effectiveLimit,
      p_languages: targetLangs
    });

    // Fallback to simple query if RPC doesn't exist yet
    if (fetchErr && fetchErr.message?.includes('get_cards_needing_translation')) {
      console.log('Using fallback query...');
      const { data: fallbackCards, error: fallbackErr } = await supabase
        .from('vocab_cards')
        .select('id, term, context_sentence')
        .eq('language', 'en')
        .order('id', { ascending: true })
        .range(offset, offset + effectiveLimit - 1);
      
      if (fallbackErr) {
        return new Response(JSON.stringify({ success: false, error: fallbackErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      cards = fallbackCards || [];
    } else if (fetchErr) {
      console.error('Fetch error:', fetchErr);
      return new Response(JSON.stringify({ success: false, error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      cards = fetchedCards || [];
    }

    if (fetchErr) {
      console.error('Fetch error:', fetchErr);
      return new Response(JSON.stringify({ success: false, error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No more cards', hasMore: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pre-fetch all existing translations for these cards in one query
    const cardIds = cards.map(c => c.id);
    const { data: existingTranslations } = await supabase
      .from('vocab_translations')
      .select('card_id, lang')
      .in('card_id', cardIds);
    
    const existingSet = new Set(
      (existingTranslations || []).map(t => `${t.card_id}:${t.lang}`)
    );

    let processed = 0;
    let errors = 0;
    let skipped = 0;
    const failedCards = new Map<string, number>(); // Track retry attempts

    console.log(`Processing ${cards.length} cards across ${targetLangs.length} languages`);

    // Process each language separately with batching
    for (const lang of targetLangs) {
      const cardsToTranslate: typeof cards = [];
      
      // Collect cards that need translation for this language
      for (const card of cards) {
        const key = `${card.id}:${lang}`;
        if (!existingSet.has(key)) {
          const retries = failedCards.get(key) || 0;
          if (retries < MAX_RETRIES) {
            cardsToTranslate.push(card);
          } else {
            console.log(`⏭️  Skipping ${card.term} (${lang}) after ${MAX_RETRIES} failures`);
            skipped++;
          }
        }
      }

      if (cardsToTranslate.length === 0) continue;

      // Process in batches
      for (let i = 0; i < cardsToTranslate.length; i += BATCH_SIZE) {
        const batch = cardsToTranslate.slice(i, i + BATCH_SIZE);
        const texts = batch.map(c => c.term);
        
        try {
          console.log(`📦 Translating batch of ${batch.length} words to ${lang}`);
          
          const { data: resp, error: invErr } = await supabase.functions.invoke('translation-service', {
            body: {
              texts: texts,
              sourceLang: 'en',
              targetLang: lang,
              includeContext: false,
            },
          });

          if (invErr || !resp?.success) {
            console.error(`Batch translate error for ${lang}:`, invErr || resp);
            // Mark all cards in batch as failed
            batch.forEach(card => {
              const key = `${card.id}:${lang}`;
              failedCards.set(key, (failedCards.get(key) || 0) + 1);
            });
            errors += batch.length;
            continue;
          }

          const results = resp.results || [];
          
          // Process each result
          for (let j = 0; j < batch.length; j++) {
            const card = batch[j];
            const result = results[j];
            
            if (!result || !result.translation) {
              console.warn(`No translation for ${card.term} -> ${lang}`);
              const key = `${card.id}:${lang}`;
              failedCards.set(key, (failedCards.get(key) || 0) + 1);
              errors++;
              continue;
            }

            const translations = [result.translation];
            if (result.alternatives) {
              translations.push(...result.alternatives.slice(0, 4));
            }

            const { error: upErr } = await supabase
              .from('vocab_translations')
              .upsert({
                user_id: null, // System translations have no user_id
                card_id: card.id,
                lang,
                translations: translations.filter(Boolean),
                provider: 'deepseek',
                quality: 1,
                is_system: true
              }, { onConflict: 'card_id,lang' });

            if (upErr) {
              console.error('Upsert error:', card.term, lang, upErr);
              const key = `${card.id}:${lang}`;
              failedCards.set(key, (failedCards.get(key) || 0) + 1);
              errors++;
            } else {
              processed++;
            }
          }

          // Small delay between batches to avoid rate limits
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          console.error(`Batch processing error for ${lang}:`, e);
          batch.forEach(card => {
            const key = `${card.id}:${lang}`;
            failedCards.set(key, (failedCards.get(key) || 0) + 1);
          });
          errors += batch.length;
        }
      }
    }

    console.log(`✅ Completed: ${processed} translations, ${errors} errors, ${skipped} skipped`);

    const nextOffset = offset + cards.length;
    const hasMore = cards.length === effectiveLimit;

    // Only auto-chain if we actually processed translations (not just skipping already-translated cards)
    if (hasMore && processed > 0) {
      const chain = (async () => {
        try {
          console.log(`⛓️  Chaining to next batch: offset=${nextOffset}`);
          await supabase.functions.invoke('vocab-translate-runner', {
            body: { offset: nextOffset, limit: effectiveLimit, languages: targetLangs },
          });
        } catch (e) {
          console.error('Self-chain failed:', e);
        }
      })();
      EdgeRuntime?.waitUntil?.(chain);
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      errors,
      skipped,
      nextOffset,
      hasMore,
      failedCount: failedCards.size,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('runner error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
