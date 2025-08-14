import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { text, sourceLang = "auto", targetLang = "en", includeContext = false } = await req.json();

    if (!text || !targetLang) {
      throw new Error('Text and target language are required');
    }

    console.log('🌐 Translation request:', { text: text.substring(0, 50) + '...', sourceLang, targetLang });

    const systemPrompt = includeContext ? 
      `You are a professional translator. Provide accurate translations and include:
       1. The translation
       2. Context or cultural notes if relevant
       3. Alternative translations if applicable
       4. Grammar explanations if helpful for learning
       
       Format as JSON: {
         "translation": "translated text",
         "context": "cultural or linguistic context",
         "alternatives": ["alt1", "alt2"],
         "grammar_notes": "helpful grammar explanation"
       }` :
      `You are a professional translator. Provide only the accurate translation of the given text. Respond with just the translated text, no additional formatting.`;

    const userPrompt = sourceLang === "auto" ? 
      `Translate this text to ${targetLang}: "${text}"` :
      `Translate this text from ${sourceLang} to ${targetLang}: "${text}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
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
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const translationResult = data.choices[0].message.content;

    let result;
    if (includeContext) {
      try {
        result = JSON.parse(translationResult);
      } catch {
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