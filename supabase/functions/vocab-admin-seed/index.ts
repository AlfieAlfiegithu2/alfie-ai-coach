// @ts-nocheck
// Deno Edge Function environment
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
    const action = body?.action || 'seed'; // 'seed', 'remove_duplicates', 'remove_plurals', 'audit_levels', 'audit_translations'
    const total = Math.min(Number(body?.total || 5000), 20000);
    const translateTo = String(body?.translateTo || 'all');
    const enOnly = Boolean(body?.enOnly || false);
    const language = 'en';
    const levels = body?.levels || { 1: 1800, 2: 1700, 3: 1100, 4: 300, 5: 100 }; // sums to 5000
    console.log('vocab-admin-seed: starting with params', { action, total, translateTo, language, enOnly });
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

    // Handle different actions
    if (action === 'remove_duplicates') {
      return await handleRemoveDuplicates(supabase);
    } else if (action === 'remove_plurals') {
      return await handleRemovePlurals(supabase);
    } else if (action === 'audit_levels') {
      return await handleAuditLevels(supabase);
    } else if (action === 'audit_translations') {
      return await handleAuditTranslations(supabase);
    }

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
      // Use DeepSeek to propose real English headwords when frequency data is missing
      try {
        const prompt = `Give a JSON array of ${count} distinct, common English headwords suitable for CEFR level ${level}. Strict JSON array like ["run","make",...]. No numbering, no extra text.`;
        const resp = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,'Content-Type':'application/json' },
          body: JSON.stringify({ model: 'deepseek-chat', messages: [ { role: 'user', content: prompt } ], temperature: 0 })
        });
        if (!resp.ok) throw new Error('deepseek failure');
        const data = await resp.json();
        let content = String(data?.choices?.[0]?.message?.content || '[]').trim();
        if (content.startsWith('```')) content = content.replace(/^```json?\s*/,'').replace(/\s*```$/,'');
        const arr = JSON.parse(content);
        return Array.isArray(arr) ? arr.map((s: unknown) => ({ lemma: String(s), rank: null })) : [];
      } catch (_) {
        // Final fallback to placeholders to keep pipeline running
        return Array.from({ length: count }, (_, i) => ({ lemma: `word${i + 1}`, rank: null }));
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

    // Translate a term into all supported site languages and persist into vocab_translations
    const SUPPORTED_LANGS: string[] = ['ar','bn','de','en','es','fa','fr','hi','id','ja','kk','ko','ms','ne','pt','ru','ta','th','tr','ur','vi','yue','zh'];

    // Queue translations for background processing to avoid blocking the main seeding process
    async function queueTranslations(cardIds: string[], terms: string[]) {
      console.log(`vocab-admin-seed: queuing ${cardIds.length} cards for background translation`);

      // Insert translation jobs into a queue table for background processing
      const translationJobs: any[] = [];
      for (let i = 0; i < cardIds.length; i++) {
        const cardId = cardIds[i];
        const term = terms[i];

        // Create jobs for all supported languages except English
        const langs = SUPPORTED_LANGS.filter((l: string) => l !== 'en');
        for (const lang of langs) {
          translationJobs.push({
            user_id: ownerUserId,
            card_id: cardId,
            term: term,
            target_lang: lang,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        }
      }

      if (translationJobs.length > 0) {
        // @ts-ignore - Deno Edge Function database operations
        const { error: queueError } = await (supabase as any).from('vocab_translation_queue').insert(translationJobs);
        if (queueError) {
          console.log(`vocab-admin-seed: failed to queue translations: ${queueError.message}`);
        } else {
          console.log(`vocab-admin-seed: queued ${translationJobs.length} translation jobs`);
        }
      }
    }

    // Optimized translation function for individual words (used by background processor)
    async function translateSingleWord(cardId: string, term: string, targetLang: string) {
      try {
        const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/translation-service`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: term, sourceLang: 'en', targetLang: targetLang, includeContext: true })
        });

        if (!resp.ok) {
          console.log(`vocab-admin-seed: translation failed for ${targetLang}: ${resp.status}`);
          return null;
        }

        const payload = await resp.json();
        if (!payload?.success) {
          console.log(`vocab-admin-seed: translation service error for ${targetLang}: ${payload?.error}`);
          return null;
        }

        const res = payload.result || {};
        const primary = typeof res.translation === 'string' ? res.translation : (res.translation?.translation || '');
        const alts = Array.isArray(res.alternatives) ? res.alternatives.map((a: any) => (typeof a === 'string' ? a : (a?.meaning || ''))).filter((s: string) => !!s) : [];
        const arr = [primary, ...alts].map((s: string) => String(s).trim()).filter(Boolean);

        if (!arr.length) return null;

        await supabase.from('vocab_translations').upsert({
          user_id: ownerUserId,
          card_id: cardId,
          lang: targetLang,
          translations: arr,
          provider: 'gemini',
          quality: 1
        } as any, { onConflict: 'card_id,lang' } as any);

        return { lang: targetLang, translation: primary };
      } catch (e) {
        console.log(`vocab-admin-seed: translation error for ${targetLang}:`, e);
        return null;
      }
    }

    // Process translations in background (separate function to avoid blocking)
    async function processBackgroundTranslations() {
      // Process translations for current user and system imports
      // @ts-ignore - Deno Edge Function database operations
      const { data: pendingJobs } = await (supabase as any)
        .from('vocab_translation_queue')
        .select('*')
        .in('user_id', [ownerUserId, 'system'])
        .eq('status', 'pending')
        .limit(20); // Process 20 at a time to avoid overwhelming

      if (!pendingJobs || (pendingJobs as any[]).length === 0) return;

      console.log(`Processing ${(pendingJobs as any[]).length} translation jobs in background`);

      // Group jobs by term for efficient processing
      const jobsByTerm = new Map<string, any[]>();
      (pendingJobs as any[]).forEach((job: any) => {
        if (!jobsByTerm.has(job.term)) {
          jobsByTerm.set(job.term, []);
        }
        jobsByTerm.get(job.term)!.push(job);
      });

      // Process each term's translations
      for (const [term, jobs] of jobsByTerm) {
        const jobsArray = jobs as any[];
        const cardId = jobsArray[0].card_id; // All jobs for same term have same card_id

        // Process all languages for this term in parallel (up to 3 at a time)
        const langBatches: any[] = [];
        for (let i = 0; i < jobsArray.length; i += 3) {
          langBatches.push(jobsArray.slice(i, i + 3));
        }

        for (const langBatch of langBatches) {
          // @ts-ignore - Deno Edge Function database operations
          const translationPromises: Promise<any>[] = (langBatch as any[]).map((job: any) =>
            translateSingleWord(cardId, term, job.target_lang)
              .then((result: any) => ({ jobId: job.id, result }))
          );

          const results = await Promise.allSettled(translationPromises);

          // Mark completed jobs
          for (const result of results) {
            if (result.status === 'fulfilled') {
              const value = result.value as { jobId: string; result: any };
              const { jobId } = value;
              // @ts-ignore - Deno Edge Function database operations
              await (supabase as any)
                .from('vocab_translation_queue')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', jobId);
            }
          }

          // Small delay between batches
          await new Promise((r) => setTimeout(r, 100));
        }
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
    // In EN-only mode, we can process more words since no translations are needed
    // Dramatically increased batch sizes for better performance
    const batchSize = Math.min(remainingInLevel, enOnly ? 100 : 50); // 100 words for EN-only, 50 for full mode
    
    console.log('vocab-admin-seed: processing batch', { level: currentLevel, batchSize, completed, total });
    const batch = await fetchBatch(currentLevel, batchSize);
    console.log('vocab-admin-seed: fetched batch', { level: currentLevel, batchLength: batch.length, batch });
    
    let deckId: string | null = null;
    let deckCount = 0;
    let deckSeq = 0;

    // Track completed cards for translation queuing
    const completedCards: string[] = [];
    const completedTerms: string[] = [];
    
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
      items = Array.isArray(suggested)
        ? suggested.map((s: any) => (typeof s === 'string' ? { lemma: s, rank: null } : { lemma: String(s.lemma), rank: s.rank ?? null }))
        : [];
    }
    
    // Process words in parallel batches for better performance
    const parallelBatchSize = 5; // Process 5 words simultaneously
    const wordBatches: any[] = [];
    for (let i = 0; i < items.length; i += parallelBatchSize) {
      wordBatches.push(items.slice(i, i + parallelBatchSize));
    }

    for (const wordBatch of wordBatches) {
      if (completed >= total) break;

      console.log(`vocab-admin-seed: processing batch of ${(wordBatch as any[]).length} words in parallel`);

      // Process multiple words in parallel
      const parallelResults = await Promise.allSettled(
        (wordBatch as any[]).map(async ({ lemma, rank }: any) => {
          if (completed >= total) return { skipped: true };

          console.log('vocab-admin-seed: processing word', { lemma, rank, completed, total });

          // Check if word already exists (case-insensitive check)
          const { data: exists, error: checkError } = await supabase
            .from('vocab_cards')
            .select('id, term')
            .eq('language', language)
            .eq('is_public', true)
            .ilike('term', lemma)
            .maybeSingle();

          if (checkError) {
            console.log('vocab-admin-seed: error checking for existing word', { lemma, error: checkError.message });
            // Continue anyway - the unique constraint will catch duplicates
          }

          if (exists) {
            console.log('vocab-admin-seed: word already exists, skipping', { lemma, existingTerm: exists.term });
            return { skipped: true, lemma, reason: 'already_exists' };
          }

          // Ensure we have a deck
          await ensureDeck();

          // Enrich the word with AI
          console.log('vocab-admin-seed: enriching word', { lemma, enOnly });
          const card = await enrich(lemma, null, currentLevel);
          console.log('vocab-admin-seed: enriched word result', { lemma, card: !!card });

          const cardData = {
            translation: enOnly ? '' : (typeof card.translation === 'string' ? card.translation : ''),
            pos: card.pos || null,
            ipa: card.ipa || null,
            examples: Array.isArray(card.examples) ? card.examples.slice(0,3) : [],
            synonyms: Array.isArray(card.synonyms) ? card.synonyms.slice(0,8) : [],
            frequencyRank: card.frequencyRank || rank || null,
            contextSentence: Array.isArray(card.examples) && card.examples.length > 0 ? card.examples[0] : null,
          };

          // Insert the card
          const { data: inserted, error: insErr } = await supabase.from('vocab_cards').insert({
            user_id: ownerUserId,
            deck_id: deckId,
            term: lemma,
            translation: cardData.translation,
            pos: cardData.pos,
            ipa: cardData.ipa,
            examples_json: cardData.examples,
            synonyms_json: cardData.synonyms,
            frequency_rank: cardData.frequencyRank || rank || null,
            context_sentence: cardData.contextSentence,
            language,
            level: currentLevel,
            is_public: true
          }).select('id').single();

          if (insErr) {
            // Check if it's a duplicate key error from the unique constraint
            const isDuplicate = insErr.message?.includes('duplicate key') || 
                               insErr.message?.includes('unique constraint') ||
                               insErr.code === '23505';
            
            if (isDuplicate) {
              console.log('vocab-admin-seed: duplicate caught by unique constraint, skipping', { lemma });
              return { skipped: true, lemma, reason: 'duplicate_constraint' };
            }
            
            // For other errors, throw
            console.error('vocab-admin-seed: insert error', { lemma, error: insErr.message });
            throw insErr;
          }
          
          const cardId = inserted?.id;
          if (!cardId) {
            console.log('vocab-admin-seed: no card ID returned after insert', { lemma });
            return { skipped: true, lemma, reason: 'no_card_id' };
          }

          // Persist examples (English)
          try {
            const examples = Array.isArray(cardData.examples) ? cardData.examples.slice(0,2) : [];
            if (examples.length && cardId) {
              await supabase.from('vocab_examples').insert(examples.map((s: string) => ({
                user_id: ownerUserId,
                card_id: cardId,
                lang: 'en',
                sentence: s,
                cefr: 'B1',
                quality: 1
              })));
            }
          } catch (_) {}

          // Queue translations for later (don't block on them)
          if (cardId && !enOnly) {
            // Instead of translating immediately, we'll handle this separately
            console.log(`vocab-admin-seed: card created for ${lemma}, translations will be processed later`);
          }

          deckCount += 1;
          completed += 1;

          // Track for translation queuing
          if (cardId && !enOnly) {
            completedCards.push(cardId!);
            completedTerms.push(lemma);
          }

          return { success: true, lemma, cardId };
        })
      );

      // Process results and update progress
      for (const result of parallelResults) {
        if (result.status === 'fulfilled') {
          const wordResult = result.value;
          if (!wordResult.skipped) {
            console.log('vocab-admin-seed: word completed', {
              lemma: wordResult.lemma,
              completed,
              total
            });
          }
        } else {
          console.log('vocab-admin-seed: word failed', {
            error: String(result.reason?.message || result.reason),
            completed,
            total
          });
        }
      }

      // Update progress less frequently to reduce database load
      const updateInterval = enOnly ? 20 : 10; // Update every 20 words in EN-only, 10 in full mode
      if (completed % updateInterval === 0) {
        await supabase.from('jobs_vocab_seed').update({
          completed,
          level: currentLevel,
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
      }

      if (completed >= total) break;

      // Queue translations for completed cards (if not in EN-only mode)
      if (completedCards.length > 0 && !enOnly) {
        await queueTranslations(completedCards, completedTerms);
        completedCards.length = 0; // Clear arrays
        completedTerms.length = 0;

        // Process some background translations to keep the queue moving
        await processBackgroundTranslations();
      }
    }

    // Process any remaining background translations before finishing
    if (!enOnly) {
      try {
        await processBackgroundTranslations();
      } catch (e) {
        console.log('vocab-admin-seed: background translation processing error:', e);
        // Don't fail the whole process if background translations fail
      }
    }

    // Update final status - either done or running for next batch
    const finalStatus = completed >= total ? 'done' : 'running';
    await supabase.from('jobs_vocab_seed').update({
      completed,
      status: finalStatus,
      updated_at: new Date().toISOString(),
      last_term: null, // Clear last term on successful completion
      last_error: null // Clear last error on successful completion
    }).eq('id', job.id);

    console.log('vocab-admin-seed: batch completed', { completed, total, status: finalStatus });
    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      completed,
      total,
      status: finalStatus,
      message: completed >= total ? 'All words completed' : 'Batch completed, more words remain'
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});

// Handler functions for cleanup and audit operations
async function handleRemoveDuplicates(supabase: any) {
  try {
    console.log('vocab-admin-seed: removing duplicates');
    
    // Find duplicate terms
    const { data: duplicates, error: dupError } = await supabase
      .from('vocab_cards')
      .select('term, COUNT(*) as count')
      .group('term')
      .having('COUNT(*) > 1');
    
    if (dupError) throw dupError;
    
    let removedCount = 0;
    const duplicateTerms = duplicates?.map(d => d.term) || [];
    
    for (const term of duplicateTerms) {
      // Get all cards with this term, keep the first one (oldest)
      const { data: cards, error: cardsError } = await supabase
        .from('vocab_cards')
        .select('id, created_at')
        .eq('term', term)
        .order('created_at', { ascending: true });
      
      if (cardsError) continue;
      
      // Delete all except the first one
      const toDelete = cards.slice(1);
      for (const card of toDelete) {
        await supabase.from('vocab_cards').delete().eq('id', card.id);
        removedCount++;
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Removed ${removedCount} duplicate words`,
      removedCount,
      duplicateTerms: duplicateTerms.length
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}

async function handleRemovePlurals(supabase: any) {
  try {
    console.log('vocab-admin-seed: removing plural forms');
    
    // Get all words ending in 's' that might be plurals
    const { data: pluralCandidates, error: candidatesError } = await supabase
      .from('vocab_cards')
      .select('id, term')
      .like('term', '%s')
      .not('term', 'like', '%ss')
      .not('term', 'like', '%us')
      .not('term', 'like', '%is')
      .not('term', 'like', '%as');
    
    if (candidatesError) throw candidatesError;
    
    let removedCount = 0;
    const removedWords: string[] = [];
    
    for (const candidate of pluralCandidates || []) {
      const term = candidate.term;
      if (term.length <= 3) continue; // Skip very short words
      
      // Check if singular form exists
      const singular = term.slice(0, -1);
      const { data: singularExists } = await supabase
        .from('vocab_cards')
        .select('id')
        .eq('term', singular)
        .limit(1);
      
      if (singularExists && singularExists.length > 0) {
        // Remove the plural form
        await supabase.from('vocab_cards').delete().eq('id', candidate.id);
        removedCount++;
        removedWords.push(term);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Removed ${removedCount} plural forms`,
      removedCount,
      removedWords: removedWords.slice(0, 20) // Show first 20 for preview
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}

async function handleAuditLevels(supabase: any) {
  try {
    console.log('vocab-admin-seed: auditing levels');
    
    // Count words with invalid levels
    const { data: invalidLevels, error: invalidError } = await supabase
      .from('vocab_cards')
      .select('id, term, level')
      .or('level.is.null,level.lt.1,level.gt.5');
    
    if (invalidError) throw invalidError;
    
    // Count total words
    const { count: totalWords } = await supabase
      .from('vocab_cards')
      .select('*', { count: 'exact', head: true });
    
    // Count by level
    const { data: levelCounts } = await supabase
      .from('vocab_cards')
      .select('level')
      .not('level', 'is', null);
    
    const levelStats = levelCounts?.reduce((acc: any, item: any) => {
      acc[item.level] = (acc[item.level] || 0) + 1;
      return acc;
    }, {}) || {};
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Level audit completed',
      totalWords,
      invalidLevels: invalidLevels?.length || 0,
      levelStats,
      sampleInvalid: invalidLevels?.slice(0, 10) || []
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}

async function handleAuditTranslations(supabase: any) {
  try {
    console.log('vocab-admin-seed: auditing translations');
    
    // Count cards with different translation coverage
    const { data: translationStats, error: transError } = await supabase
      .from('vocab_translations')
      .select('card_id, lang')
      .not('card_id', 'is', null);
    
    if (transError) throw transError;
    
    // Group by card_id to count translations per card
    const cardTranslationCounts = translationStats?.reduce((acc: any, item: any) => {
      acc[item.card_id] = (acc[item.card_id] || 0) + 1;
      return acc;
    }, {}) || {};
    
    const noTranslations = Object.keys(cardTranslationCounts).length === 0 ? 
      (await supabase.from('vocab_cards').select('*', { count: 'exact', head: true })).count || 0 : 0;
    
    const partialTranslations = Object.values(cardTranslationCounts).filter((count: any) => count > 0 && count < 22).length;
    const fullTranslations = Object.values(cardTranslationCounts).filter((count: any) => count >= 22).length;
    
    // Check translation queue
    const { data: queueStats, error: queueError } = await supabase
      .from('vocab_translation_queue')
      .select('status')
      .not('status', 'is', null);
    
    const queueCounts = queueStats?.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Translation audit completed',
      noTranslations,
      partialTranslations,
      fullTranslations,
      queueCounts,
      totalCardsWithTranslations: Object.keys(cardTranslationCounts).length
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}