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

  try {
    const authHeader = req.headers.get('Authorization') || '';

    // Use service role key for background processing to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Process background translations (works for any user, including system imports)
    await processBackgroundTranslations(supabase, authHeader);

    return new Response(JSON.stringify({
      success: true,
      message: 'Translation processing completed'
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});

  // Process translations in background (simplified version)
async function processBackgroundTranslations(supabase: any, authHeader: string) {
  // @ts-ignore - Deno Edge Function database operations
  const { data: pendingJobs } = await (supabase as any)
    .from('vocab_translation_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(100); // Process more at once for efficiency

  if (!pendingJobs || (pendingJobs as any[]).length === 0) {
    console.log('No pending translation jobs found');
    return;
  }

  console.log(`Processing ${(pendingJobs as any[]).length} translation jobs in background`);

  // Group jobs by term for efficient processing
  const jobsByTerm = new Map<string, any[]>();
  (pendingJobs as any[]).forEach((job: any) => {
    if (!jobsByTerm.has(job.term)) {
      jobsByTerm.set(job.term, []);
    }
    jobsByTerm.get(job.term)!.push(job);
  });

  let processedCount = 0;
  let errorCount = 0;

  // Process each term's translations
  for (const [term, jobs] of jobsByTerm) {
    const jobsArray = jobs as any[];
    const cardId = jobsArray[0].card_id; // All jobs for same term have same card_id

    // Process all languages for this term in parallel (up to 5 at a time for efficiency)
    const langBatches: any[] = [];
    for (let i = 0; i < jobsArray.length; i += 5) {
      langBatches.push(jobsArray.slice(i, i + 5));
    }

    for (const langBatch of langBatches) {
      // @ts-ignore - Deno Edge Function database operations
      const translationPromises: Promise<any>[] = (langBatch as any[]).map((job: any) =>
        translateSingleWord(cardId, term, job.target_lang, supabase, authHeader)
          .then((res: any) => ({ jobId: job.id, ok: !!res }))
      );

      const results = await Promise.allSettled(translationPromises);

      // Mark job outcomes
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const value = result.value as { jobId: string; ok: boolean };
          if (value.ok) {
            processedCount++;
            await (supabase as any)
              .from('vocab_translation_queue')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('id', value.jobId);
          } else {
            errorCount++;
            await (supabase as any)
              .from('vocab_translation_queue')
              .update({ status: 'failed', error_message: 'Empty translation', updated_at: new Date().toISOString() })
              .eq('id', value.jobId);
          }
        } else {
          errorCount++;
          const reason = (result as PromiseRejectedResult).reason;
          console.error('Translation failed for job:', reason);
          const jobId = (reason && reason.jobId) ? reason.jobId : null;
          if (jobId) {
            await (supabase as any)
              .from('vocab_translation_queue')
              .update({ status: 'failed', error_message: String(reason), updated_at: new Date().toISOString() })
              .eq('id', jobId);
          }
        }
      }

      // Small delay between batches to avoid overwhelming
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`✅ Translation batch completed: ${processedCount} successful, ${errorCount} failed`);

  // Check remaining jobs and chain next batch(es) so UI doesn't need to stay open
  const { count: remaining } = await (supabase as any)
    .from('vocab_translation_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const rem = remaining || 0;
  if (rem > 0) {
    // Fire-and-forget up to 3 parallel next batches (continue even if previous batch had only failures)
    const parallel = Math.min(3, Math.ceil(rem / 100));
    const kicks = Array.from({ length: parallel }).map(() =>
      (supabase as any).functions.invoke('process-translations', { body: { reason: 'chain' } }).catch(() => null)
    );
    await Promise.allSettled(kicks);
    console.log(`🔁 Chained ${parallel} next batch(es), remaining: ${rem}`);
  } else {
    console.log('🎉 No remaining jobs, stopping chain.');
  }
}

// Enhanced translation function with rich data
async function translateSingleWord(cardId: string, term: string, targetLang: string, supabase: any, authHeader: string) {
  try {
    // Call translation-service via Supabase client
    const { data, error } = await (supabase as any).functions.invoke('translation-service', {
      body: {
        text: term,
        sourceLang: 'en',
        targetLang,
        includeContext: true
      },
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    if (error || !data?.success) {
      console.log(`Translation service error for ${targetLang}:`, error || data?.error);
      return null;
    }

    const res = data.result || {};
    const primary = typeof res.translation === 'string' ? res.translation : (res.translation?.translation || '');
    const alts = Array.isArray(res.alternatives)
      ? res.alternatives
          .map((a: any) => (typeof a === 'string' ? a : (a?.meaning || '')))
          .filter((s: string) => !!s)
      : [];
    const arr = [primary, ...alts].map((s: string) => String(s).trim()).filter(Boolean);

    if (!arr.length) return null;

    // Store translation (only valid columns: user_id, card_id, lang, translations, provider, quality, is_system)
    const { error: upsertError } = await (supabase as any)
      .from('vocab_translations')
      .upsert({
        user_id: null, // System translations have no user_id
        card_id: cardId,
        lang: targetLang,
        translations: arr,
        provider: 'deepseek',
        quality: 1,
        is_system: true
      } as any, { onConflict: 'card_id,lang' } as any);

    if (upsertError) {
      console.error(`Failed to store translation for ${targetLang}:`, upsertError);
      return null;
    }

    // Store enrichment details (POS, IPA, Context, etc.)
    try {
      await (supabase as any)
        .from('vocab_translation_enrichments')
        .upsert({
          card_id: cardId,
          lang: targetLang,
          translation: primary,
          pos: (res as any)?.pos ?? null,
          ipa: (res as any)?.ipa ?? null,
          context: typeof (res as any)?.context === 'string' ? (res as any).context : null,
          examples_json: (res as any)?.examples ?? null,
          synonyms_json: (res as any)?.synonyms ?? null,
          conjugation: (res as any)?.conjugation ?? null,
          provider: 'deepseek',
          quality: 1
        } as any, { onConflict: 'card_id,lang' } as any);
    } catch (e) {
      console.warn('Failed to store enrichment for', targetLang, e);
    }

    console.log(`✅ Stored translation: ${term} -> ${targetLang}: ${primary}`);
    return { lang: targetLang, translation: primary };
  } catch (e) {
    console.log(`Translation error for ${targetLang}:`, e);
    return null;
  }
}
