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
      `You are a professional translator. When translating words or phrases, provide comprehensive information including multiple meanings when applicable and part of speech information.
       
       Always respond with valid JSON in this exact format:
       {
         "translation": "primary translation",
         "alternatives": [
           {"meaning": "alternative1", "pos": "noun"},
           {"meaning": "alternative2", "pos": "verb"},
           {"meaning": "alternative3", "pos": "adjective"}
         ],
         "context": "cultural or linguistic context if relevant",
         "grammar_notes": "brief grammar explanation if helpful"
       }
       
       Rules:
       - "translation" should be the most common/primary translation
       - "alternatives" should include ALL different meanings/contexts with their part of speech (pos: "noun", "verb", "adjective", "adverb", "preposition", etc.)
       - Include as many alternatives as exist - no limit on number
       - "pos" should be the part of speech in English (noun, verb, adjective, etc.)
       - "context" should explain when/how to use different meanings, or null if not needed
       - "grammar_notes" should be brief and helpful, or null if not needed
       - Always respond with valid JSON, no additional text` :
      `You are a professional translator. Provide only the accurate translation of the given text. If the word has multiple common meanings, separate them with " / " (e.g., "right: correcto / derecho"). Respond with just the translated text, no additional formatting.`;

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
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
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