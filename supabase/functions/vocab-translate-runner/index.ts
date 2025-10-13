import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TranslationResult = { success: boolean; result?: unknown; error?: string };

// Small helper copied from batch function, simplified and robust
function extractTranslations(result: any): string[] {
  try {
    let text = '';
    if (typeof result === 'string') {
      text = result;
    } else if (result && typeof result === 'object') {
      text = JSON.stringify(result);
    } else {
      return [];
    }
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    try {
      const parsed = JSON.parse(text);
      const translations: string[] = [];
      if (typeof (parsed as any).translation === 'string') {
        const cleaned = ((parsed as any).translation as string).trim();
        if (cleaned) translations.push(cleaned);
      }
      if (Array.isArray((parsed as any).alternatives)) {
        (parsed as any).alternatives.forEach((alt: any) => {
          if (typeof alt === 'string') {
            const cleaned = alt.trim();
            if (cleaned) translations.push(cleaned);
          } else if (alt && typeof alt.meaning === 'string') {
            const cleaned = alt.meaning.trim();
            if (cleaned) translations.push(cleaned);
          }
        });
      }
      if (translations.length > 0) return translations.filter(Boolean).slice(0, 5);
    } catch { /* not valid JSON */ }

    const fallback = text
      .replace(/[\"'\[\]{}]/g, ' ')
      .replace(/```/g, '')
      .split(/[,،\s]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0 && t.length < 100);
    return fallback.length > 0 ? fallback.slice(0, 5) : [text.slice(0, 100)];
  } catch {
    return [];
  }
}

// Deno EdgeRuntime global is injected by Supabase; declare for TS
// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offset = 0, limit = 150, languages } = await req.json().catch(() => ({ offset: 0, limit: 150 }));

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

    const targetLangs: string[] = languages || ['ar','bn','de','es','fa','fr','hi','id','ja','kk','ko','ms','ne','pt','ru','ta','th','tr','ur','vi','yue','zh'];

    console.log(`Runner: fetching cards offset=${offset} limit=${limit}`);

    const { data: cards, error: fetchErr } = await supabase
      .from('vocab_cards')
      .select('id, term, context_sentence')
      .eq('is_public', true)
      .eq('language', 'en')
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

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

    let processed = 0;
    let errors = 0;
    let lastCardId: string | null = null;
    let lastLang: string | null = null;

    for (const card of cards) {
      for (const lang of targetLangs) {
        try {
          // Skip if already translated
          const { data: existing } = await supabase
            .from('vocab_translations')
            .select('id')
            .eq('card_id', card.id)
            .eq('lang', lang)
            .maybeSingle();
          if (existing) continue;

          const { data: resp, error: invErr } = await supabase.functions.invoke('translation-service', {
            body: {
              text: card.term,
              sourceLang: 'en',
              targetLang: lang,
              includeContext: true,
              context: card.context_sentence || undefined,
            },
          });

          lastCardId = card.id;
          lastLang = lang;

          if (invErr || !resp?.success) {
            console.error(`translate error ${card.term} -> ${lang}`, invErr || resp);
            errors++;
            continue;
          }

          const translations = extractTranslations((resp as TranslationResult).result);
          if (translations.length === 0) {
            errors++;
            continue;
          }

          const { error: upErr } = await supabase
            .from('vocab_translations')
            .upsert({
              user_id: null,
              card_id: card.id,
              lang,
              translations,
              provider: 'deepseek',
              quality: 1,
              is_system: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'card_id,lang' });

          if (upErr) {
            console.error('upsert error', upErr);
            errors++;
          } else {
            processed++;
          }

          // Soft rate limit
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          console.error('loop error', e);
          errors++;
        }
      }
    }

    const nextOffset = offset + cards.length;
    const hasMore = cards.length === limit;

    // Chain next batch in background so UI doesn't have to keep calling
    if (hasMore) {
      const chain = (async () => {
        try {
          await supabase.functions.invoke('vocab-translate-runner', {
            body: { offset: nextOffset, limit, languages: targetLangs },
          });
        } catch (e) {
          console.error('self-chain invoke failed', e);
        }
      })();
      // Ensure it keeps running after responding
      EdgeRuntime?.waitUntil?.(chain);
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      errors,
      lastCardId,
      lastLang,
      nextOffset,
      hasMore,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('runner error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
