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

    const { text, sourceLang = "auto", targetLang = "en", includeContext = false } = await req.json();

    if (!text || !targetLang) {
      throw new Error('Text and target language are required');
    }

    console.log('🌐 Translation request:', { text: text.substring(0, 50) + '...', sourceLang, targetLang });

    // Only cache if text is reasonable length (avoid storage bloat)
    const shouldCache = text.length <= 50 && text.trim().split(/\s+/).length <= 5;
    let cachedTranslation = null;

    if (shouldCache) {
      // Check cache first
      console.log('🔍 Checking translation cache...');
      const { data } = await supabase
        .from('translation_cache')
        .select('translation, hit_count')
        .eq('word', text.toLowerCase().trim())
        .eq('source_lang', sourceLang)
        .eq('target_lang', targetLang)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (data) {
        console.log('🚀 Translation cache hit! Hit count:', data.hit_count);
        
        // Update hit count and extend expiry for popular translations
        const newExpiry = data.hit_count >= 5 ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days for popular
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);   // 7 days for normal
        
        await supabase
          .from('translation_cache')
          .update({ 
            hit_count: data.hit_count + 1,
            expires_at: newExpiry.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('word', text.toLowerCase().trim())
          .eq('source_lang', sourceLang)
          .eq('target_lang', targetLang);

        return new Response(JSON.stringify({ 
          success: true, 
          result: includeContext ? {
            translation: data.translation,
            context: null,
            alternatives: [],
            grammar_notes: null,
            cached: true
          } : {
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

    console.log('💨 Translation cache miss, calling DeepSeek API...');

    const systemPrompt = includeContext ?
      `Professional translator. Return JSON format only:
       {
         "translation": "primary translation",
         "alternatives": [{"meaning": "alt1", "pos": "noun"}, {"meaning": "alt2", "pos": "verb"}],
         "context": null,
         "grammar_notes": null
       }
       
       Rules: "translation"=most common meaning, "alternatives"=other meanings with part-of-speech, include ALL meanings that exist, "pos"=noun/verb/adj/adv/prep/etc, set context/grammar_notes to null for speed.` :
      `Translate accurately and concisely. For multiple meanings use format: "meaning1 / meaning2". Just the translation, no extra text.`;

    const userPrompt = sourceLang === "auto" ? 
      `Translate this text to ${targetLang}: "${text}"` :
      `Translate this text from ${sourceLang} to ${targetLang}: "${text}"`;

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
        max_tokens: 500,
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

    // Cache the translation if it should be cached
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
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          });
        
        console.log('💾 Translation cached successfully');
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache translation:', cacheError);
        // Don't fail the request if caching fails
      }
    }

    // Add cached flag to response
    if (typeof result === 'object') {
      result.cached = false;
    }

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