import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

// Initialize Supabase client for caching
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: extract first valid JSON array from a string, tolerant to extra text/code fences
function extractJsonArray(input: string): string | null {
  if (!input) return null;
  let s = input.trim();
  if (s.startsWith('```')) {
    // remove code fences
    s = s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  }
  const start = s.indexOf('[');
  if (start === -1) return null;
  let inString = false;
  let escape = false;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

// Helper: translate a single text with strict JSON instruction (fallback for batch)
async function translateSingleViaApi(text: string, sourceLang: string, targetLang: string): Promise<{ translation: string; alternatives: string[] }> {
  const prompt = sourceLang === 'auto'
    ? `Translate to ${targetLang}: "${text}". Return ONLY valid JSON: {"translation": "...", "alternatives": []}`
    : `Translate from ${sourceLang} to ${targetLang}: "${text}". Return ONLY valid JSON: {"translation": "...", "alternatives": []}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
      }
    }),
  });

  const data = await res.json();
  const content: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  try {
    let c = content.trim();
    if (c.startsWith('```')) c = c.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
    const obj = JSON.parse(c);
    return { translation: obj.translation ?? String(text), alternatives: Array.isArray(obj.alternatives) ? obj.alternatives : [] };
  } catch {
    return { translation: content || String(text), alternatives: [] };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if Gemini API key is configured
    if (!geminiApiKey) {
      console.error('❌ Gemini API key not configured for translation service');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Translation service temporarily unavailable. Please try again in a moment.',
        details: 'Gemini API key not configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Gemini API key found for translation, length:', geminiApiKey.length);

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

    console.log('💨 Calling Gemini API...', { 
      batch: isBatch, 
      uncached: isBatch ? uncachedTexts.length : 1 
    });

    const textsToTranslate = isBatch ? uncachedTexts : [text];
    
    const prompt = isBatch ?
      `Translate these ${textsToTranslate.length} words to ${targetLang}:\n${textsToTranslate.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nReturn STRICT JSON array ONLY: [{"translation": "...", "alternatives": ["...", "..."]}, ...]` :
      (includeContext ?
        `Translate "${text}" from ${sourceLang} to ${targetLang}. Return ONLY STRICT JSON: {"translation": "...", "alternatives": [{"meaning": "...", "pos": "..."}], "context": null, "grammar_notes": null}` :
        `Translate "${text}" to ${targetLang}. Return only the translation text.`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Unknown error';
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data = await response.json();
    const translationResult = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Handle batch results
    if (isBatch) {
      try {
        // Try robust extraction of a JSON array
        const extracted = extractJsonArray(translationResult);
        let batchResults: any[] | null = null;
        if (extracted) {
          try {
            batchResults = JSON.parse(extracted);
          } catch (e) {
            console.error('Primary JSON.parse failed on extracted array:', e);
          }
        }

        if (!batchResults || !Array.isArray(batchResults)) {
          console.warn('⚠️ Falling back to per-item translation due to batch parse failure.');
          // Fallback: translate each uncached text individually (limited concurrency)
          const concurrency = 3;
          for (let i = 0; i < uncachedTexts.length; i += concurrency) {
            const chunk = uncachedTexts.slice(i, i + concurrency);
            const idxChunk = uncachedIndices.slice(i, i + concurrency);
            const translated = await Promise.all(
              chunk.map((t) => translateSingleViaApi(t, sourceLang, targetLang))
            );
            for (let j = 0; j < translated.length; j++) {
              const idx = idxChunk[j];
              const { translation, alternatives } = translated[j];
              results[idx] = { translation, alternatives: alternatives || [], cached: false };
              const currentText = chunk[j];
              if (currentText.length <= 50 && translation) {
            try {
              await supabase
                .from('translation_cache')
                .insert({
                  word: currentText.toLowerCase().trim(),
                  source_lang: sourceLang,
                  target_lang: targetLang,
                  translation,
                  hit_count: 1,
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                });
            } catch (_) {}

              }
            }
          }
        } else {
          // Parsed ok — map results
          for (let i = 0; i < uncachedIndices.length; i++) {
            const idx = uncachedIndices[i];
            const batchResult = batchResults[i] || { translation: uncachedTexts[i] };
            results[idx] = {
              translation: batchResult.translation,
              alternatives: Array.isArray(batchResult.alternatives) ? batchResult.alternatives : [],
              cached: false,
            };
            const currentText = uncachedTexts[i];
            if (currentText.length <= 50 && batchResult.translation) {
            try {
              await supabase
                .from('translation_cache')
                .insert({
                  word: currentText.toLowerCase().trim(),
                  source_lang: sourceLang,
                  target_lang: targetLang,
                  translation: batchResult.translation,
                  hit_count: 1,
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                });
            } catch (_) {}

            }
          }
        }

        console.log('✅ Batch translation completed:', results.length, 'words');
        return new Response(JSON.stringify({
          success: true,
          results,
          sourceLang,
          targetLang,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (parseError) {
        console.error('Batch parsing failed:', parseError);
        // As a last resort, return an error to caller (runner will retry/skip)
        return new Response(JSON.stringify({ success: false, error: 'Batch parse and fallback failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Single text handling
    let result;
    if (includeContext) {
      try {
        // Enhanced JSON parsing with multiple fallback strategies
        let cleanedResult = translationResult.trim();
        
        // Strategy 1: Remove markdown code blocks
        if (cleanedResult.includes('```')) {
          const jsonMatch = cleanedResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanedResult = jsonMatch[1].trim();
          }
        }
        
        // Strategy 2: Extract JSON from mixed content
        const jsonStart = cleanedResult.indexOf('{');
        const jsonEnd = cleanedResult.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanedResult = cleanedResult.substring(jsonStart, jsonEnd + 1);
        }
        
        // Strategy 3: Clean common issues
        cleanedResult = cleanedResult
          .replace(/^[^{]*/, '') // Remove text before first {
          .replace(/[^}]*$/, '') // Remove text after last }
          .trim();
        
        result = JSON.parse(cleanedResult);
        
        // Validate and clean the result
        if (!result.translation) {
          throw new Error('No translation field found');
        }
        
        // Ensure alternatives is an array with proper structure
        if (result.alternatives && Array.isArray(result.alternatives)) {
          result.alternatives = result.alternatives
            .filter((alt: any) => {
              if (typeof alt === 'string') {
                return alt.trim().length > 0;
              }
              if (alt && typeof alt === 'object') {
                return alt.meaning && alt.meaning.trim().length > 0;
              }
              return false;
            })
            .map((alt: any) => {
              if (typeof alt === 'string') {
                return { meaning: alt.trim(), pos: 'noun' };
              }
              return alt;
            });
        } else {
          result.alternatives = [];
        }
        
        // Ensure required fields exist
        result.context = result.context || null;
        result.grammar_notes = result.grammar_notes || null;
        
      } catch (parseError) {
        console.warn('Enhanced JSON parsing failed, using fallback:', parseError);
        console.log('Raw response:', translationResult);
        
        // Fallback: Extract simple translation from any format
        let fallbackTranslation = translationResult.trim();
        
        // Try to extract translation from various formats
        const translationMatch = fallbackTranslation.match(/"translation":\s*"([^"]+)"/);
        if (translationMatch) {
          fallbackTranslation = translationMatch[1];
        } else if (fallbackTranslation.includes(':')) {
          // Try to extract from "word: translation" format
          const colonMatch = fallbackTranslation.match(/:\s*"?([^"]+)"?/);
          if (colonMatch) {
            fallbackTranslation = colonMatch[1].trim();
          }
        }
        
        result = {
          translation: fallbackTranslation,
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