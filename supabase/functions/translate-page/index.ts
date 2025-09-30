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

    // Create content hash to detect changes
    const contentHash = btoa(JSON.stringify(content)).substring(0, 32);
    console.log(`Content hash for ${pageKey}: ${contentHash}`);

    // Check cache first
    const { data: cached } = await supabase
      .from('page_translations')
      .select('content, created_at')
      .eq('page_key', pageKey)
      .eq('language_code', targetLanguage)
      .single();

    // Check if we have a stored content version
    const { data: versionData } = await supabase
      .from('page_content_versions')
      .select('content_hash')
      .eq('page_key', pageKey)
      .single();

    // If content has changed, clear all cached translations for this page
    if (versionData && versionData.content_hash !== contentHash) {
      console.log(`Content hash changed for ${pageKey}, clearing all translations`);
      await supabase
        .from('page_translations')
        .delete()
        .eq('page_key', pageKey);
      
      // Update content version
      await supabase
        .from('page_content_versions')
        .update({ content_hash: contentHash, last_updated: new Date().toISOString() })
        .eq('page_key', pageKey);
    } else if (!versionData) {
      // First time - store content hash
      await supabase
        .from('page_content_versions')
        .insert({ page_key: pageKey, content_hash: contentHash });
    }

    // If cached translation exists and content hasn't changed, use it
    if (cached && versionData?.content_hash === contentHash) {
      const cacheAge = Date.now() - new Date(cached.created_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      if (cacheAge < sevenDays) {
        console.log(`Using cached translation for ${targetLanguage}`);
        return new Response(
          JSON.stringify({ success: true, translation: cached.content }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
      'zh': 'Simplified Chinese',
      'ja': 'Japanese',
      'vi': 'Vietnamese',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi'
    };

    console.log(`Translating page '${pageKey}' to ${languageNames[targetLanguage]} (${targetLanguage})`);

    const prompt = `Translate the following JSON content to ${languageNames[targetLanguage] || targetLanguage}. 
IMPORTANT: For Chinese, use Simplified Chinese characters. For Japanese, use appropriate kanji and hiragana.
Ensure all text is properly translated and culturally appropriate.
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
      console.error('Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Translation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log(`Translation response for ${targetLanguage}: ${translatedText.substring(0, 200)}...`);
    
    // Extract JSON from markdown code blocks if present
    let translatedContent;
    try {
      const jsonMatch = translatedText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       translatedText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : translatedText;
      translatedContent = JSON.parse(jsonStr.trim());
      console.log(`Successfully parsed translation for ${targetLanguage}`);
    } catch (e) {
      console.error('Failed to parse translation:', e, 'Raw text:', translatedText);
      return new Response(
        JSON.stringify({ error: 'Invalid translation format', rawText: translatedText.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache the translation
    const { error: cacheError } = await supabase
      .from('page_translations')
      .upsert({
        page_key: pageKey,
        language_code: targetLanguage,
        content: translatedContent
      });

    if (cacheError) {
      console.error('Failed to cache translation:', cacheError);
    } else {
      console.log(`Successfully cached translation for ${pageKey} in ${targetLanguage}`);
    }

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
