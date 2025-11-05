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
    
    // User client for authentication check
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    // Service role client for database operations (bypass RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { languages, maxWords, onlyMissing = true, startCardId, startLang, offset = 0 } = await req.json();
    
    // Default to all 22 languages if not specified
    const targetLanguages = languages || ['ar', 'bn', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'id', 'ja', 'kk', 'ko', 'ms', 'ne', 'pt', 'ru', 'ta', 'th', 'tr', 'ur', 'vi', 'yue', 'zh'];
    const limit = maxWords || 100;

    console.log(`Starting batch translation for ${targetLanguages.length} languages, limit: ${limit}, resume from card: ${startCardId || 'beginning'}, lang: ${startLang || 'first'}`);

    // Get vocabulary words that need translation
    const { data: vocabCards, error: fetchError } = await supabaseClient
      .from('vocab_cards')
      .select('id, term, context_sentence')
      .eq('is_public', true)
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

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
    let lastProcessedCardId = startCardId || null;
    let lastProcessedLang = startLang || null;

    // Process each card across ALL languages
    for (const card of vocabCards) {
      for (const targetLang of targetLanguages) {
        // Skip until we reach resume point (if resuming)
        if (startCardId && startLang) {
          if (card.id !== startCardId) continue;
          if (targetLang !== startLang && lastProcessedCardId === startCardId) continue;
        }

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

          // Clean and extract translations from API response
          const extractTranslations = (result: any): string[] => {
            try {
              let text = '';
              
              // Extract text from result
              if (typeof result === 'string') {
                text = result;
              } else if (result && typeof result === 'object') {
                text = JSON.stringify(result);
              } else {
                return [];
              }
              
              // Remove ALL code fences (```json, ```, etc.) more aggressively
              text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
              
              // Try to parse as JSON
              try {
                const parsed = JSON.parse(text);
                const translations: string[] = [];
                
                // Extract primary translation
                if (typeof parsed.translation === 'string') {
                  const cleaned = parsed.translation.trim();
                  if (cleaned) translations.push(cleaned);
                }
                
                // Extract alternatives
                if (Array.isArray(parsed.alternatives)) {
                  parsed.alternatives.forEach((alt: any) => {
                    if (typeof alt === 'string') {
                      const cleaned = alt.trim();
                      if (cleaned) translations.push(cleaned);
                    } else if (alt && typeof alt.meaning === 'string') {
                      const cleaned = alt.meaning.trim();
                      if (cleaned) translations.push(cleaned);
                    }
                  });
                }
                
                if (translations.length > 0) {
                  return translations.filter(Boolean).slice(0, 5);
                }
              } catch (e) {
                // Not valid JSON, treat as plain text
              }
              
              // Fallback: split by common separators and clean
              const fallback = text
                .replace(/["'\[\]{}]/g, ' ')
                .replace(/```/g, '')
                .split(/[,،\s]+/)
                .map(t => t.trim())
                .filter(t => t.length > 0 && t.length < 100);
              
              return fallback.length > 0 ? fallback.slice(0, 5) : [text.slice(0, 100)];
            } catch (e) {
              console.error('Failed to extract translations:', e);
              return [];
            }
          };

          const translations = extractTranslations(payload.result);


          if (translations.length === 0) {
            console.error(`No valid translations for ${card.term} -> ${targetLang}`);
            errorCount++;
            continue;
          }

          // Store translation in vocab_translations table as system translation
          const { error: upsertError } = await supabaseClient
            .from('vocab_translations')
            .upsert({
              user_id: null, // System translations have no user_id
              card_id: card.id,
              lang: targetLang,
              translations: translations,
              provider: 'gemini',
              quality: 1,
              is_system: true, // Mark as system-wide translation
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
            console.log(`✓ Translated ${card.term} -> ${targetLang}: ${translations[0]}`);
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
        canResume: errorCount > 0,
        nextOffset: offset + vocabCards.length,
        hasMore: vocabCards.length === limit
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
