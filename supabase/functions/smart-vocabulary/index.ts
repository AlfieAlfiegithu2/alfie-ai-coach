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
    const { action, word, context, userId, nativeLanguage } = await req.json();

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    if (action === 'saveWord') {
      return await saveWordToVocabulary(supabase, word, context, userId, nativeLanguage);
    } else if (action === 'getUserVocabulary') {
      return await getUserVocabulary(supabase, userId);
    } else if (action === 'removeWord') {
      const { wordId } = await req.json();
      return await removeWordFromVocabulary(supabase, wordId, userId);
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in smart-vocabulary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function saveWordToVocabulary(supabase: any, word: string, context: string, userId: string, nativeLanguage: string) {
  // Check if translation already exists in vocabulary_words
  const { data: existingWord } = await supabase
    .from('vocabulary_words')
    .select('*')
    .eq('word', word.toLowerCase())
    .eq('language_code', nativeLanguage)
    .single();

  let vocabularyWordId;
  let translation;

  if (existingWord) {
    // Use existing translation and increment usage count
    vocabularyWordId = existingWord.id;
    translation = existingWord.translation;
    
    await supabase
      .from('vocabulary_words')
      .update({ usage_count: existingWord.usage_count + 1 })
      .eq('id', existingWord.id);
  } else {
    // Get translation from OpenAI and save new vocabulary word
    const translationResult = await getTranslationFromAPI(word, nativeLanguage);
    translation = translationResult;

    const { data: newWord, error: insertError } = await supabase
      .from('vocabulary_words')
      .insert({
        word: word.toLowerCase(),
        language_code: nativeLanguage,
        translation: translation,
        usage_count: 1
      })
      .select()
      .single();

    if (insertError) throw insertError;
    vocabularyWordId = newWord.id;
  }

  // Save to user's personal vocabulary (with conflict handling)
  const { error: userVocabError } = await supabase
    .from('user_vocabulary')
    .upsert({
      user_id: userId,
      vocabulary_word_id: vocabularyWordId,
      context: context
    }, {
      onConflict: 'user_id,vocabulary_word_id'
    });

  if (userVocabError) throw userVocabError;

  return new Response(JSON.stringify({ 
    success: true, 
    word: word,
    translation: translation,
    cached: !!existingWord 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getUserVocabulary(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('user_vocabulary')
    .select(`
      id,
      context,
      saved_at,
      vocabulary_words:vocabulary_word_id (
        word,
        translation,
        language_code
      )
    `)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (error) throw error;

  const vocabulary = data.map((item: any) => ({
    id: item.id,
    word: item.vocabulary_words.word,
    translation: item.vocabulary_words.translation,
    context: item.context,
    savedAt: item.saved_at,
    languageCode: item.vocabulary_words.language_code
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