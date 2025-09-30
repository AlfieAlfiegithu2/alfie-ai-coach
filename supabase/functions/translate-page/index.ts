import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageKey, targetLanguage, content } = await req.json();

    if (!pageKey || !targetLanguage || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const { data: cached } = await supabase
      .from('page_translations')
      .select('content')
      .eq('page_key', pageKey)
      .eq('language_code', targetLanguage)
      .single();

    if (cached) {
      return new Response(
        JSON.stringify({ success: true, translation: cached.content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Translate using Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Translation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const languageNames: Record<string, string> = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'vi': 'Vietnamese',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi'
    };

    const prompt = `Translate the following JSON content to ${languageNames[targetLanguage] || targetLanguage}. 
Maintain the exact JSON structure. Only translate the string values, not the keys.
Return ONLY valid JSON with the translated content.

${JSON.stringify(content, null, 2)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8000,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Translation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from markdown code blocks if present
    let translatedContent;
    try {
      const jsonMatch = translatedText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       translatedText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : translatedText;
      translatedContent = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('Failed to parse translation:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid translation format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache the translation
    await supabase
      .from('page_translations')
      .upsert({
        page_key: pageKey,
        language_code: targetLanguage,
        content: translatedContent
      });

    return new Response(
      JSON.stringify({ success: true, translation: translatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
