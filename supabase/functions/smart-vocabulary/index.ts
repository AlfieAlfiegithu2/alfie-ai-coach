import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { action, word, context, userId, nativeLanguage, wordId } = requestBody;

    console.log('📝 Smart vocabulary request:', { action, word: word?.substring(0, 20) + '...', userId: userId?.substring(0, 8) + '...', nativeLanguage });

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    if (action === 'saveWord') {
      return await saveWordToVocabulary(supabase, word, context, userId, nativeLanguage);
    } else if (action === 'getUserVocabulary') {
      return await getUserVocabulary(supabase, userId);
    } else if (action === 'removeWord') {
      return await removeWordFromVocabulary(supabase, wordId, userId);
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('❌ Error in smart-vocabulary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function saveWordToVocabulary(supabase: any, word: string, context: string, userId: string, nativeLanguage: string) {
  console.log('💾 Saving word to vocabulary:', { word, nativeLanguage, userId: userId.substring(0, 8) + '...' });
  
  try {
    // Validate inputs
    if (!word || !userId) {
      throw new Error('Missing required parameters: word or userId');
    }

    // Check if user already has this word saved
    const { data: existingUserWord } = await supabase
      .from('user_vocabulary')
      .select('id, word, translations')
      .eq('user_id', userId)
      .eq('word', word.toLowerCase().trim())
      .maybeSingle();

    if (existingUserWord) {
      console.log('ℹ️  Word already saved by user');
      return new Response(JSON.stringify({ 
        success: true, 
        word: word,
        translation: existingUserWord.translations?.[0] || 'Translation available',
        cached: true,
        alreadySaved: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔄 Getting new translation from API...');
    // Get translation from OpenAI
    const translation = await getTranslationFromAPI(word, nativeLanguage);
    console.log('✅ Got translation:', translation);

    // Save to user's vocabulary using the simple table structure
    const { data: userVocabData, error: userVocabError } = await supabase
      .from('user_vocabulary')
      .insert({
        user_id: userId,
        word: word.toLowerCase().trim(),
        translations: [translation],
        part_of_speech: null // Will be determined later if needed
      })
      .select()
      .single();

    if (userVocabError) {
      console.error('❌ Error saving to user vocabulary:', userVocabError);
      throw userVocabError;
    }

    console.log('✅ Successfully saved word to vocabulary');
    return new Response(JSON.stringify({ 
      success: true, 
      word: word,
      translation: translation,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Error in saveWordToVocabulary:', error);
    throw error;
  }
}

async function getUserVocabulary(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('user_vocabulary')
    .select('id, word, translations, part_of_speech, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const vocabulary = data.map((item: any) => ({
    id: item.id,
    word: item.word,
    translation: item.translations?.[0] || 'No translation',
    context: 'Saved word',
    savedAt: item.created_at,
    languageCode: 'en'
  }));

  return new Response(JSON.stringify({ vocabulary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function removeWordFromVocabulary(supabase: any, wordId: string, userId: string) {
  const { error } = await supabase
    .from('user_vocabulary')
    .delete()
    .eq('id', wordId)
    .eq('user_id', userId);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getTranslationFromAPI(word: string, targetLanguage: string): Promise<string> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the given English word to ${targetLanguage} language. Return ONLY the translation, no explanations, no additional text.`
        },
        {
          role: 'user',
          content: word
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}