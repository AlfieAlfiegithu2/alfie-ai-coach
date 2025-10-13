import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { languages, maxWords, onlyMissing = true, startCardId, startLang } = await req.json();
    
    // Default to all 22 languages if not specified
    const targetLanguages = languages || ['ar', 'bn', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'id', 'ja', 'kk', 'ko', 'ms', 'ne', 'pt', 'ru', 'ta', 'th', 'tr', 'ur', 'vi', 'yue', 'zh'];
    const limit = maxWords || 100;

    console.log(`Starting batch translation for ${targetLanguages.length} languages, limit: ${limit}, resume from card: ${startCardId || 'beginning'}, lang: ${startLang || 'first'}`);

    // Get vocabulary words that need translation
    const { data: vocabCards, error: fetchError } = await supabaseClient
      .from('vocab_cards')
      .select('id, term')
      .eq('is_public', true)
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch vocab cards: ${fetchError.message}`);
    }

    if (!vocabCards || vocabCards.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No vocabulary words found to translate', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${vocabCards.length} vocabulary cards to process`);

    let translatedCount = 0;
    let errorCount = 0;
    let shouldResume = !!startCardId;
    let lastProcessedCardId = startCardId;
    let lastProcessedLang = startLang;

    // Process each card
    for (const card of vocabCards) {
      // Skip cards until we reach the resume point
      if (shouldResume && card.id !== startCardId) {
        continue;
      }
      shouldResume = false;

      for (const targetLang of targetLanguages) {
        // Skip languages until we reach the resume point
        if (lastProcessedLang && lastProcessedCardId === card.id && targetLang !== lastProcessedLang) {
          continue;
        }
        lastProcessedLang = null; // Reset after finding resume point

        try {
          // Check if translation already exists
          const { data: existing } = await supabaseClient
            .from('vocab_translations')
            .select('id')
            .eq('card_id', card.id)
            .eq('lang', targetLang)
            .maybeSingle();

          if (existing) {
            console.log(`Translation already exists for ${card.term} -> ${targetLang}, skipping`);
            continue;
          }

          // Call translation service with context
          const translationResp = await supabaseClient.functions.invoke('translation-service', {
            body: {
              text: card.term,
              sourceLang: 'en',
              targetLang: targetLang,
              includeContext: true,
              context: card.context_sentence || undefined
            }
          });

          lastProcessedCardId = card.id;
          lastProcessedLang = targetLang;

          if (translationResp.error) {
            console.error(`Translation error for ${card.term} -> ${targetLang}:`, translationResp.error);
            errorCount++;
            continue;
          }

          const payload = translationResp.data;
          if (!payload?.success) {
            console.error(`Translation service returned error for ${card.term} -> ${targetLang}`);
            errorCount++;
            continue;
          }

          const result = payload.result || {};
          const primary = typeof result.translation === 'string' 
            ? result.translation 
            : (result.translation?.translation || '');
          
          const alternatives = Array.isArray(result.alternatives) 
            ? result.alternatives.map((a: any) => 
                typeof a === 'string' ? a : (a?.meaning || '')
              ).filter((s: string) => !!s) 
            : [];
          
          const translations = [primary, ...alternatives]
            .map((s: string) => String(s).trim())
            .filter(Boolean);

          if (translations.length === 0) {
            console.error(`No valid translations for ${card.term} -> ${targetLang}`);
            errorCount++;
            continue;
          }

          // Store translation in vocab_translations table
          const { error: upsertError } = await supabaseClient
            .from('vocab_translations')
            .upsert({
              user_id: card.id, // Use card_id as user_id for system-wide translations
              card_id: card.id,
              lang: targetLang,
              translations: translations,
              provider: 'deepseek',
              quality: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'card_id,lang'
            });

          if (upsertError) {
            console.error(`Failed to store translation for ${card.term} -> ${targetLang}:`, upsertError);
            errorCount++;
          } else {
            translatedCount++;
            console.log(`✓ Translated ${card.term} -> ${targetLang}: ${primary}`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error translating ${card.term} -> ${targetLang}:`, error);
          errorCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch translation completed`,
        processed: translatedCount,
        errors: errorCount,
        totalWords: vocabCards.length,
        totalLanguages: targetLanguages.length,
        lastProcessedCardId: lastProcessedCardId,
        lastProcessedLang: lastProcessedLang,
        canResume: errorCount > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch translation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
