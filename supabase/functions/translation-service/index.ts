import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

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
        model: 'deepseek-chat', // Already the fastest DeepSeek model for this task
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 400, // Reduced from 1000 for faster response
        temperature: 0.1, // Lower temperature for faster, more deterministic responses
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const translationResult = data.choices[0].message.content;

    let result;
    if (includeContext) {
      try {
        // Clean the response to ensure it's valid JSON
        let cleanedResult = translationResult.trim();
        
        // Remove any markdown code block formatting if present
        if (cleanedResult.startsWith('```json')) {
          cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResult.startsWith('```')) {
          cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        result = JSON.parse(cleanedResult);
        
        // Ensure alternatives is an array with part of speech info
        if (result.alternatives && Array.isArray(result.alternatives)) {
          result.alternatives = result.alternatives.filter((alt: any) => 
            alt && (typeof alt === 'string' ? alt.trim().length > 0 : alt.meaning && alt.meaning.trim().length > 0)
          );
        } else {
          result.alternatives = [];
        }
        
      } catch (parseError) {
        console.warn('JSON parsing failed, treating as simple translation:', parseError);
        // If JSON parsing fails, treat as simple translation
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