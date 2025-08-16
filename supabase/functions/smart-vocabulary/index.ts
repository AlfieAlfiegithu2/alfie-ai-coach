import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with the auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    const { action, word, context, nativeLanguage, wordId } = requestBody;

    // Input validation
    if (!action || typeof action !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📝 Smart vocabulary request:', { action, word: word?.substring(0, 20) + '...', userId: user.id?.substring(0, 8) + '...', nativeLanguage });

    if (action === 'saveWord') {
      // Validate input
      if (!word || typeof word !== 'string' || word.length > 100) {
        return new Response(JSON.stringify({ error: 'Invalid word' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (context && (typeof context !== 'string' || context.length > 1000)) {
        return new Response(JSON.stringify({ error: 'Context too long' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return await saveWordToVocabulary(supabase, word.trim(), context?.trim() || '', user.id, nativeLanguage || 'English');
    } else if (action === 'getUserVocabulary') {
      return await getUserVocabulary(supabase, user.id);
    } else if (action === 'removeWord') {
      if (!wordId || typeof wordId !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid word ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return await removeWordFromVocabulary(supabase, wordId, user.id);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in smart-vocabulary function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
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
      model: 'gpt-4o-mini',
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