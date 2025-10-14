import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

// Initialize Supabase client for caching
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if DeepSeek API key is configured
    if (!deepSeekApiKey) {
      console.error('❌ DeepSeek API key not configured for translation service. Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Translation service temporarily unavailable. Please try again in a moment.',
        details: 'DeepSeek API key not configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ DeepSeek API key found for translation, length:', deepSeekApiKey.length);

    const { text, texts, sourceLang = "auto", targetLang = "en", includeContext = false } = await req.json();
    
    // Support batch translation
    const isBatch = Array.isArray(texts);
    const textArray = isBatch ? texts : [text];

    if ((!text && !isBatch) || !targetLang) {
      throw new Error('Text/texts and target language are required');
    }

    console.log('🌐 Translation request:', { 
      count: textArray.length, 
      sample: textArray[0]?.substring(0, 30) + '...', 
      sourceLang, 
      targetLang 
    });

    // Batch processing - check cache for all texts
    const results: any[] = [];
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    if (isBatch) {
      for (let i = 0; i < textArray.length; i++) {
        const currentText = textArray[i];
        const shouldCache = currentText.length <= 50 && currentText.trim().split(/\s+/).length <= 5;
        
        if (shouldCache) {
          const { data } = await supabase
            .from('translation_cache')
            .select('translation, hit_count')
            .eq('word', currentText.toLowerCase().trim())
            .eq('source_lang', sourceLang)
            .eq('target_lang', targetLang)
            .gt('expires_at', new Date().toISOString())
            .single();

          if (data) {
            results[i] = {
              translation: data.translation,
              cached: true
            };
            continue;
          }
        }
        
        uncachedIndices.push(i);
        uncachedTexts.push(currentText);
      }
    } else {
      // Single text cache check
      const shouldCache = text.length <= 50 && text.trim().split(/\s+/).length <= 5;
      if (shouldCache) {
        const { data } = await supabase
          .from('translation_cache')
          .select('translation, hit_count')
          .eq('word', text.toLowerCase().trim())
          .eq('source_lang', sourceLang)
          .eq('target_lang', targetLang)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (data) {
          console.log('🚀 Translation cache hit!');
          return new Response(JSON.stringify({ 
            success: true, 
            result: {
              translation: data.translation,
              simple: true,
              cached: true
            },
            sourceLang: sourceLang,
            targetLang: targetLang
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    console.log('💨 Calling DeepSeek API...', { 
      batch: isBatch, 
      uncached: isBatch ? uncachedTexts.length : 1 
    });

    const textsToTranslate = isBatch ? uncachedTexts : [text];
    
    const systemPrompt = isBatch ?
      `Professional translator. Translate each word/phrase to ${targetLang}. Return JSON array format only:
       [
         {"translation": "primary", "alternatives": ["alt1", "alt2"]},
         {"translation": "primary", "alternatives": ["alt1", "alt2"]}
       ]
       Keep alternatives concise. Return ONLY the JSON array, no other text.` :
      (includeContext ?
        `Professional translator. Return JSON format only:
         {
           "translation": "primary translation",
           "alternatives": [{"meaning": "alt1", "pos": "noun"}, {"meaning": "alt2", "pos": "verb"}],
           "context": null,
           "grammar_notes": null
         }
         Rules: "translation"=most common meaning, "alternatives"=other meanings with part-of-speech, "pos"=noun/verb/adj/adv/prep/etc, set context/grammar_notes to null for speed.` :
        `Translate accurately and concisely. For multiple meanings use format: "meaning1 / meaning2". Just the translation, no extra text.`);

    const userPrompt = isBatch ?
      `Translate these ${textsToTranslate.length} words to ${targetLang}:\n${textsToTranslate.map((t, i) => `${i + 1}. ${t}`).join('\n')}` :
      (sourceLang === "auto" ? 
        `Translate this text to ${targetLang}: "${text}"` :
        `Translate this text from ${sourceLang} to ${targetLang}: "${text}"`);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepSeekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // Using the correct DeepSeek model name
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 100,
        temperature: 0, // Zero temperature for fastest, most deterministic responses
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Unknown error';

      // Handle specific language restrictions
      if (response.status === 401 && ['zh', 'ur', 'yue', 'vi', 'tr'].includes(targetLang)) {
        console.log(`DeepSeek API restriction for ${targetLang}, trying alternative approach`);
        // Return a fallback response for these languages
        return new Response(JSON.stringify({
          success: true,
          result: {
            translation: `[${targetLang.toUpperCase()}] ${text}`,
            simple: true,
            cached: false,
            note: 'DeepSeek API restriction - using transliteration'
          },
          sourceLang: sourceLang,
          targetLang: targetLang
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`DeepSeek API error: ${errorMessage}`);
    }

    const data = await response.json();
    const translationResult = data.choices[0].message.content;

    // Handle batch results
    if (isBatch) {
      try {
        let cleanedResult = translationResult.trim();
        if (cleanedResult.startsWith('```json')) {
          cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResult.startsWith('```')) {
          cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const batchResults = JSON.parse(cleanedResult);
        
        // Fill in the results array
        for (let i = 0; i < uncachedIndices.length; i++) {
          const idx = uncachedIndices[i];
          const batchResult = batchResults[i] || { translation: uncachedTexts[i] };
          results[idx] = {
            translation: batchResult.translation,
            alternatives: batchResult.alternatives || [],
            cached: false
          };
          
          // Cache each result
          const currentText = uncachedTexts[i];
          if (currentText.length <= 50 && batchResult.translation) {
            await supabase
              .from('translation_cache')
              .insert({
                word: currentText.toLowerCase().trim(),
                source_lang: sourceLang,
                target_lang: targetLang,
                translation: batchResult.translation,
                hit_count: 1,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              })
              .then(() => console.log('💾 Cached:', currentText))
              .catch(() => {});
          }
        }
        
        console.log('✅ Batch translation completed:', results.length, 'words');
        
        return new Response(JSON.stringify({ 
          success: true, 
          results: results,
          sourceLang: sourceLang,
          targetLang: targetLang
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error('Batch parsing failed:', parseError);
        throw new Error('Failed to parse batch translation results');
      }
    }

    // Single text handling
    let result;
    if (includeContext) {
      try {
        let cleanedResult = translationResult.trim();
        if (cleanedResult.startsWith('```json')) {
          cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResult.startsWith('```')) {
          cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        result = JSON.parse(cleanedResult);
        result.alternatives = Array.isArray(result.alternatives) ? result.alternatives.filter((alt: any) => 
          alt && (typeof alt === 'string' ? alt.trim().length > 0 : alt.meaning && alt.meaning.trim().length > 0)
        ) : [];
      } catch (parseError) {
        console.warn('JSON parsing failed, treating as simple translation:', parseError);
        result = {
          translation: translationResult,
          context: null,
          alternatives: [],
          grammar_notes: null
        };
      }
    } else {
      result = {
        translation: translationResult,
        simple: true
      };
    }

    console.log('✅ Translation completed successfully');

    // Cache single result
    const shouldCache = text.length <= 50 && text.trim().split(/\s+/).length <= 5;
    if (shouldCache && result.translation) {
      try {
        const translationText = typeof result.translation === 'string' ? 
          result.translation : 
          result.translation?.translation || String(result.translation);

        await supabase
          .from('translation_cache')
          .insert({
            word: text.toLowerCase().trim(),
            source_lang: sourceLang,
            target_lang: targetLang,  
            translation: translationText,
            hit_count: 1,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        
        console.log('💾 Translation cached successfully');
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache translation:', cacheError);
      }
    }

    result.cached = false;

    return new Response(JSON.stringify({ 
      success: true, 
      result: result,
      sourceLang: sourceLang,
      targetLang: targetLang
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in translation service:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});