import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

// Language code to full name mapping for better prompts
const LANG_NAMES: Record<string, string> = {
  'zh': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)', 'hi': 'Hindi', 'es': 'Spanish', 
  'fr': 'French', 'ar': 'Arabic', 'bn': 'Bengali', 'pt': 'Portuguese', 'ru': 'Russian', 
  'ja': 'Japanese', 'ur': 'Urdu', 'id': 'Indonesian', 'de': 'German', 'vi': 'Vietnamese', 
  'tr': 'Turkish', 'it': 'Italian', 'ko': 'Korean', 'fa': 'Persian', 'ta': 'Tamil', 
  'th': 'Thai', 'yue': 'Cantonese', 'ms': 'Malay', 'te': 'Telugu', 'mr': 'Marathi', 
  'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam', 'pa': 'Punjabi', 'or': 'Odia', 
  'as': 'Assamese', 'sw': 'Swahili', 'ha': 'Hausa', 'yo': 'Yoruba', 'ig': 'Igbo', 
  'am': 'Amharic', 'zu': 'Zulu', 'af': 'Afrikaans', 'pl': 'Polish', 'uk': 'Ukrainian', 
  'ro': 'Romanian', 'nl': 'Dutch', 'el': 'Greek', 'cs': 'Czech', 'hu': 'Hungarian', 
  'sv': 'Swedish', 'bg': 'Bulgarian', 'sr': 'Serbian', 'hr': 'Croatian', 'sk': 'Slovak', 
  'no': 'Norwegian', 'da': 'Danish', 'fi': 'Finnish', 'sq': 'Albanian', 'sl': 'Slovenian', 
  'et': 'Estonian', 'lv': 'Latvian', 'lt': 'Lithuanian', 'uz': 'Uzbek', 'kk': 'Kazakh', 
  'az': 'Azerbaijani', 'mn': 'Mongolian', 'he': 'Hebrew', 'ps': 'Pashto', 'ka': 'Georgian', 
  'hy': 'Armenian', 'tl': 'Filipino', 'my': 'Burmese', 'km': 'Khmer', 'si': 'Sinhala', 'ne': 'Nepali'
};

// All supported languages
const ALL_LANGUAGES = [
  'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'ru', 'ja',
  'ur', 'id', 'de', 'vi', 'tr', 'it', 'ko', 'fa', 'ta', 'th', 'yue', 'ms',
  'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as',
  'sw', 'ha', 'yo', 'ig', 'am', 'zu', 'af',
  'pl', 'uk', 'ro', 'nl', 'el', 'cs', 'hu', 'sv', 'bg', 'sr', 'hr', 'sk', 'no', 'da', 'fi', 'sq', 'sl', 'et', 'lv', 'lt',
  'uz', 'kk', 'az', 'mn',
  'he', 'ps', 'ka', 'hy',
  'tl', 'my', 'km', 'si', 'ne',
  'zh-TW'
];

interface TranslationResult {
  word: string;
  translation: string;
  example: string;
  alternatives?: string[];
}

// Translate a batch of words to a single language
async function translateBatch(words: string[], targetLang: string): Promise<TranslationResult[]> {
  const langName = LANG_NAMES[targetLang] || targetLang;
  
  const systemPrompt = `You are a professional translator. Translate English words to ${langName}.
Return a JSON array with translations and example sentences.

Rules:
- translation: The most natural, commonly used translation
- example: A short, useful example sentence in ${langName} using the translation
- alternatives: 1-2 alternative translations (optional)
- For function words (of, the, is), provide the equivalent or usage explanation
- NEVER return empty translations

Output format (strict JSON array):
[
  {"word": "hello", "translation": "你好", "example": "你好，很高兴认识你。", "alternatives": ["您好"]},
  {"word": "book", "translation": "书", "example": "我在读一本有趣的书。", "alternatives": ["书籍", "书本"]}
]`;

  const userPrompt = `Translate these ${words.length} English words to ${langName}:
${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Return ONLY the JSON array, no other text.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'Alfie AI Coach',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error(`API error for ${targetLang}:`, error);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let results: TranslationResult[] = [];
    try {
      // Clean up the response
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
      }
      
      // Find the JSON array
      const start = jsonStr.indexOf('[');
      const end = jsonStr.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        jsonStr = jsonStr.slice(start, end + 1);
      }
      
      results = JSON.parse(jsonStr);
      
      // Validate and ensure all words have translations
      if (Array.isArray(results)) {
        results = results.map((r, i) => ({
          word: r.word || words[i],
          translation: r.translation || words[i],
          example: r.example || '',
          alternatives: Array.isArray(r.alternatives) ? r.alternatives : []
        }));
      }
    } catch (parseError) {
      console.error(`JSON parse error for ${targetLang}:`, parseError);
      // Fallback: return words as-is
      results = words.map(w => ({ word: w, translation: w, example: '', alternatives: [] }));
    }
    
    return results;
  } catch (error) {
    console.error(`Translation error for ${targetLang}:`, error);
    return [];
  }
}

// Helper to chunk array into smaller arrays
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 45000; // 45 seconds (safe margin under 60s limit)

  try {
    const { 
      batchSize = 15,           // Words per API call
      cardsPerRun = 10,         // Cards to process per run (increased from 5)
      parallelLanguages = 5,    // Number of languages to process in parallel
      languages = ALL_LANGUAGES,
      continueFrom = null       // Resume from specific card_id
    } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get cards that need translation using a smarter query
    // Find cards that have fewer than the total number of languages translated
    const totalLanguages = languages.length;
    
    // Use RPC or raw query to find cards needing translation
    const { data: cardsNeedingTranslation, error: rpcError } = await supabase.rpc(
      'get_cards_needing_translation_v2',
      { 
        target_count: totalLanguages,
        card_limit: cardsPerRun,
        continue_from_id: continueFrom || null
      }
    );

    // Fallback to simple query if RPC doesn't exist
    let cards = cardsNeedingTranslation;
    let cardsError = rpcError;
    
    if (rpcError) {
      console.log('RPC not available, using raw SQL query to find cards needing translation');
      
      // Use a smarter query that directly finds cards with fewer translations
      // This is much more efficient than fetching all cards and filtering client-side
      const continueClause = continueFrom ? `AND vc.id > '${continueFrom}'` : '';
      
      const { data: cardsNeedingTrans, error: rawError } = await supabase.rpc(
        'exec_sql',
        {
          sql: `
            SELECT vc.id, vc.term
            FROM vocab_cards vc
            LEFT JOIN (
              SELECT card_id, COUNT(*) as trans_count
              FROM vocab_translations
              GROUP BY card_id
            ) vt ON vc.id = vt.card_id
            WHERE vc.is_public = true 
              AND vc.language = 'en'
              AND COALESCE(vt.trans_count, 0) < ${totalLanguages}
              ${continueClause}
            ORDER BY vc.id ASC
            LIMIT ${cardsPerRun}
          `
        }
      );
      
      // If exec_sql RPC doesn't exist, use a different approach
      if (rawError) {
        console.log('exec_sql not available, using subquery approach');
        
        // Get cards that DON'T have all translations yet
        // First, get IDs of cards that already have 69+ translations
        const { data: fullyTranslatedIds } = await supabase
          .from('vocab_translations')
          .select('card_id')
          .then(async (res) => {
            if (res.error) return { data: [] };
            
            // Count translations per card
            const countMap: Record<string, number> = {};
            (res.data || []).forEach(t => {
              countMap[t.card_id] = (countMap[t.card_id] || 0) + 1;
            });
            
            // Get IDs of fully translated cards
            const fullyDoneIds = Object.entries(countMap)
              .filter(([_, count]) => count >= totalLanguages)
              .map(([id, _]) => id);
            
            return { data: fullyDoneIds };
          });
        
        // Now get cards that are NOT in the fully translated list
        let query = supabase
          .from('vocab_cards')
          .select('id, term')
          .eq('is_public', true)
          .eq('language', 'en')
          .order('id', { ascending: true })
          .limit(cardsPerRun * 5); // Get more to filter
        
        if (continueFrom) {
          query = query.gt('id', continueFrom);
        }
        
        // Exclude fully translated cards
        if (fullyTranslatedIds && fullyTranslatedIds.length > 0) {
          // Can't use .not('id', 'in', array) for large arrays, so filter client-side
          const fullyDoneSet = new Set(fullyTranslatedIds);
          const { data: allCards, error: fetchError } = await query;
          cardsError = fetchError;
          
          if (!fetchError && allCards) {
            cards = allCards.filter(c => !fullyDoneSet.has(c.id)).slice(0, cardsPerRun);
          }
        } else {
          const { data: allCards, error: fetchError } = await query;
          cardsError = fetchError;
          cards = allCards?.slice(0, cardsPerRun) || [];
        }
      } else {
        cards = cardsNeedingTrans || [];
        cardsError = null;
      }
    }

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`);
    }

    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No more cards to translate',
        completed: true,
        stats: { processed: 0, translations: 0 }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get existing translations for these cards
    const cardIds = cards.map((c: any) => c.id);
    const { data: existingTranslations } = await supabase
      .from('vocab_translations')
      .select('card_id, lang')
      .in('card_id', cardIds);

    const existingSet = new Set(
      (existingTranslations || []).map(t => `${t.card_id}:${t.lang}`)
    );

    let totalTranslations = 0;
    let totalErrors = 0;
    const processedCards: string[] = [];
    let lastCardId = '';

    // Filter languages that need processing for these cards
    const languagesNeedingWork: string[] = [];
    for (const lang of languages) {
      const needsTranslation = (cards as { id: string; term: string }[]).some(card => {
        const key = `${card.id}:${lang}`;
        return !existingSet.has(key);
      });
      if (needsTranslation) {
        languagesNeedingWork.push(lang);
      }
    }

    console.log(`🌍 Processing ${languagesNeedingWork.length} languages for ${cards.length} cards (parallel: ${parallelLanguages})`);

    // Process languages in parallel chunks
    const languageChunks = chunkArray(languagesNeedingWork, parallelLanguages);
    
    for (const langChunk of languageChunks) {
      // Check time limit before each chunk
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏱️ Time limit approaching, processed ${totalTranslations} translations`);
        break;
      }

      // Process this chunk of languages in parallel
      const chunkPromises = langChunk.map(async (lang) => {
        let langTranslations = 0;
        let langErrors = 0;

        // Collect words that need translation for this language
        const wordsToTranslate: { cardId: string; term: string }[] = [];
        
        for (const card of cards as { id: string; term: string }[]) {
          const key = `${card.id}:${lang}`;
          if (!existingSet.has(key)) {
            wordsToTranslate.push({ cardId: card.id, term: card.term });
          }
        }

        if (wordsToTranslate.length === 0) {
          return { lang, translations: 0, errors: 0, processedCardIds: [] };
        }

        // Batch translate
        const terms = wordsToTranslate.map(w => w.term);
        
        try {
          const results = await translateBatch(terms, lang);

          if (results.length === 0) {
            return { lang, translations: 0, errors: terms.length, processedCardIds: [] };
          }

          const processedCardIds: string[] = [];

          // Store translations
          for (let i = 0; i < wordsToTranslate.length; i++) {
            const { cardId, term } = wordsToTranslate[i];
            const result = results[i];

            if (!result || !result.translation) {
              langErrors++;
              continue;
            }

            const translations = [result.translation];
            if (result.alternatives && result.alternatives.length > 0) {
              translations.push(...result.alternatives.slice(0, 3));
            }

            // Upsert translation
            const { error: upsertError } = await supabase
              .from('vocab_translations')
              .upsert({
                user_id: null,
                card_id: cardId,
                lang: lang,
                translations: translations.filter(Boolean),
                provider: 'gemini',
                quality: 1,
                is_system: true
              }, { onConflict: 'card_id,lang' });

            if (upsertError) {
              console.error(`Upsert error for ${term} -> ${lang}:`, upsertError);
              langErrors++;
            } else {
              langTranslations++;
              
              // Store example sentence if available (fire and forget)
              if (result.example) {
                supabase
                  .from('vocab_translation_enrichments')
                  .upsert({
                    card_id: cardId,
                    lang: lang,
                    translation: result.translation,
                    context: result.example,
                    provider: 'gemini',
                    quality: 1
                  }, { onConflict: 'card_id,lang' })
                  .then(() => {})
                  .catch(() => {});
              }
            }

            if (!processedCardIds.includes(cardId)) {
              processedCardIds.push(cardId);
            }
          }

          return { lang, translations: langTranslations, errors: langErrors, processedCardIds };
        } catch (error) {
          console.error(`Error processing ${lang}:`, error);
          return { lang, translations: 0, errors: terms.length, processedCardIds: [] };
        }
      });

      // Wait for all parallel translations in this chunk
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      // Aggregate results
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          totalTranslations += result.value.translations;
          totalErrors += result.value.errors;
          for (const cardId of result.value.processedCardIds) {
            if (!processedCards.includes(cardId)) {
              processedCards.push(cardId);
            }
          }
        } else {
          console.error('Chunk promise rejected:', result.reason);
          totalErrors += cards.length; // Assume all failed
        }
      }

      // Update lastCardId
      if (cards.length > 0) {
        lastCardId = (cards as { id: string }[])[cards.length - 1].id;
      }

      // Small delay between chunks to avoid rate limits
      await new Promise(r => setTimeout(r, 50));
    }

    const duration = Date.now() - startTime;
    const hasMore = cards.length === cardsPerRun;

    console.log(`✅ Batch complete: ${totalTranslations} translations, ${totalErrors} errors, ${duration}ms (${parallelLanguages} parallel)`);

    return new Response(JSON.stringify({
      success: true,
      stats: {
        cardsProcessed: processedCards.length,
        translations: totalTranslations,
        errors: totalErrors,
        duration: duration,
        languagesProcessed: languagesNeedingWork.length,
        parallelLanguages: parallelLanguages
      },
      hasMore: hasMore,
      lastCardId: lastCardId,
      continueFrom: lastCardId // Use this to resume
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Batch translation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

