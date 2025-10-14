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
          .then((result: any) => ({ jobId: job.id, result }))
      );

      const results = await Promise.allSettled(translationPromises);

      // Mark completed jobs
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const value = result.value as { jobId: string; result: any };
          const { jobId } = value;
          processedCount++;
          // @ts-ignore - Deno Edge Function database operations
          await (supabase as any)
            .from('vocab_translation_queue')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', jobId);
        } else {
          errorCount++;
          console.error(`Translation failed for job:`, result.reason);
        }
      }

      // Small delay between batches to avoid overwhelming
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`✅ Translation batch completed: ${processedCount} successful, ${errorCount} failed`);
}

// Enhanced translation function with rich data
async function translateSingleWord(cardId: string, term: string, targetLang: string, supabase: any, authHeader: string) {
  try {
    const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/translation-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
      body: JSON.stringify({ 
        text: term, 
        sourceLang: 'en', 
        targetLang: targetLang, 
        includeContext: true,
        includePOS: true,
        includeIPA: true
      })
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

    // Store rich translation data including POS, IPA, and context
    const { error: upsertError } = await supabase.from('vocab_translations').upsert({
      user_id: cardId, // Use card_id as user_id for system-wide translations
      card_id: cardId,
      lang: targetLang,
      translations: arr,
      provider: 'deepseek',
      quality: 1,
      // Add rich data fields
      pos: res.pos || null,
      ipa: res.ipa || null,
      context_sentence: res.context || null
    } as any, { onConflict: 'card_id,lang' } as any);
    
    if (upsertError) {
      console.error(`Failed to store translation for ${targetLang}:`, upsertError);
      return null;
    }
    
    console.log(`✅ Stored translation: ${term} -> ${targetLang}: ${primary}`);

    return { 
      lang: targetLang, 
      translation: primary, 
      pos: res.pos, 
      ipa: res.ipa, 
      context: res.context 
    };
  } catch (e) {
    console.log(`Translation error for ${targetLang}:`, e);
    return null;
  }
}
