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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 50000; // 50 seconds (safe margin under 60s limit)

  try {
    const { 
      batchSize = 15,      // Words per API call
      cardsPerRun = 5,     // Cards to process per run
      languages = ALL_LANGUAGES,
      continueFrom = null  // Resume from specific card_id
    } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get cards that need translation
    let query = supabase
      .from('vocab_cards')
      .select('id, term')
      .eq('is_public', true)
      .eq('language', 'en')
      .order('id', { ascending: true })
      .limit(cardsPerRun);

    if (continueFrom) {
      query = query.gt('id', continueFrom);
    }

    const { data: cards, error: cardsError } = await query;

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
    const cardIds = cards.map(c => c.id);
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

    // Process each language
    for (const lang of languages) {
      // Check time limit
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏱️ Time limit approaching, stopping at language ${lang}`);
        break;
      }

      // Collect words that need translation for this language
      const wordsToTranslate: { cardId: string; term: string }[] = [];
      
      for (const card of cards) {
        const key = `${card.id}:${lang}`;
        if (!existingSet.has(key)) {
          wordsToTranslate.push({ cardId: card.id, term: card.term });
        }
      }

      if (wordsToTranslate.length === 0) {
        continue;
      }

      // Batch translate
      const terms = wordsToTranslate.map(w => w.term);
      console.log(`📦 Translating ${terms.length} words to ${lang}...`);
      
      const results = await translateBatch(terms, lang);

      if (results.length === 0) {
        totalErrors += terms.length;
        continue;
      }

      // Store translations
      for (let i = 0; i < wordsToTranslate.length; i++) {
        const { cardId, term } = wordsToTranslate[i];
        const result = results[i];

        if (!result || !result.translation) {
          totalErrors++;
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
          totalErrors++;
        } else {
          totalTranslations++;
          
          // Store example sentence if available
          if (result.example) {
            try {
              await supabase
                .from('vocab_translation_enrichments')
                .upsert({
                  card_id: cardId,
                  lang: lang,
                  translation: result.translation,
                  context: result.example,
                  provider: 'gemini',
                  quality: 1
                }, { onConflict: 'card_id,lang' });
            } catch (e) {
              // Ignore enrichment errors
            }
          }
        }

        if (!processedCards.includes(cardId)) {
          processedCards.push(cardId);
        }
        lastCardId = cardId;
      }

      // Small delay between languages to avoid rate limits
      await new Promise(r => setTimeout(r, 100));
    }

    const duration = Date.now() - startTime;
    const hasMore = cards.length === cardsPerRun;

    console.log(`✅ Batch complete: ${totalTranslations} translations, ${totalErrors} errors, ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      stats: {
        cardsProcessed: processedCards.length,
        translations: totalTranslations,
        errors: totalErrors,
        duration: duration,
        languagesProcessed: languages.length
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

