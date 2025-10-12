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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Process background translations (works for any user, including system imports)
    await processBackgroundTranslations(supabase);

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
async function processBackgroundTranslations(supabase: any) {
  // @ts-ignore - Deno Edge Function database operations
  const { data: pendingJobs } = await (supabase as any)
    .from('vocab_translation_queue')
    .select('*')
    .in('user_id', ['system']) // Only process system imports for now
    .eq('status', 'pending')
    .limit(50); // Process more at once for efficiency

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
        translateSingleWord(cardId, term, job.target_lang, supabase)
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

      // Small delay between batches to avoid overwhelming
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

// Simplified translation function
async function translateSingleWord(cardId: string, term: string, targetLang: string, supabase: any) {
  try {
    const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/translation-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: term, sourceLang: 'en', targetLang: targetLang, includeContext: true })
    });

    if (!resp.ok) {
      console.log(`Translation failed for ${targetLang}: ${resp.status}`);
      return null;
    }

    const payload = await resp.json();
    if (!payload?.success) {
      console.log(`Translation service error for ${targetLang}: ${payload?.error}`);
      return null;
    }

    const res = payload.result || {};
    const primary = typeof res.translation === 'string' ? res.translation : (res.translation?.translation || '');
    const alts = Array.isArray(res.alternatives) ? res.alternatives.map((a: any) => (typeof a === 'string' ? a : (a?.meaning || ''))).filter((s: string) => !!s) : [];
    const arr = [primary, ...alts].map((s: string) => String(s).trim()).filter(Boolean);

    if (!arr.length) return null;

    await supabase.from('vocab_translations').upsert({
      user_id: 'system',
      card_id: cardId,
      lang: targetLang,
      translations: arr,
      provider: 'deepseek',
      quality: 1
    } as any, { onConflict: 'card_id,lang' } as any);

    return { lang: targetLang, translation: primary };
  } catch (e) {
    console.log(`Translation error for ${targetLang}:`, e);
    return null;
  }
}
