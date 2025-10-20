import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authorization required' 
      }), {
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
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid or expired token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { word, part_of_speech, translation, translations } = await req.json();
    
    // Use translations array if provided, otherwise fall back to single translation
    const translationArray = translations || (translation ? [translation] : []);
    
    // Validate required fields
    if (!word || translationArray.length === 0) {
      console.error('Missing required fields:', { word: !!word, hasTranslations: translationArray.length > 0 });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Word and at least one translation are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('💾 Adding word to book:', { 
      userId: user.id, 
      word: word.substring(0, 20) + '...', 
      part_of_speech, 
      translationsCount: translationArray.length 
    });

    // Use service role client for vocabulary_words operations (RLS restricts normal users)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const normalizedWord = word.trim().toLowerCase();
    const primaryTranslation = translationArray[0];
    
    // Get user's language from profiles (default to 'en' if not set)
    const { data: profile } = await supabase
      .from('profiles')
      .select('native_language')
      .eq('id', user.id)
      .single();
    
    const languageCode = profile?.native_language?.toLowerCase().substring(0, 2) || 'en';

    // Step 1: Ensure the word exists in vocabulary_words table (using service role)
    let vocabularyWordId: string;
    
    const { data: existingVocabWord } = await supabaseAdmin
      .from('vocabulary_words')
      .select('id, usage_count')
      .eq('word', normalizedWord)
      .eq('language_code', languageCode)
      .single();

    if (existingVocabWord) {
      vocabularyWordId = existingVocabWord.id;
      
      // Increment usage count
      await supabaseAdmin
        .from('vocabulary_words')
        .update({ usage_count: existingVocabWord.usage_count + 1 })
        .eq('id', vocabularyWordId);
    } else {
      // Create new vocabulary word
      const { data: newVocabWord, error: vocabError } = await supabaseAdmin
        .from('vocabulary_words')
        .insert({
          word: normalizedWord,
          language_code: languageCode,
          translation: primaryTranslation,
          usage_count: 1,
          verified: false
        })
        .select('id')
        .single();

      if (vocabError || !newVocabWord) {
        console.error('Error creating vocabulary word:', vocabError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to save word to vocabulary database' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      vocabularyWordId = newVocabWord.id;
    }

    // Step 2: Check if user already has this word
    const { data: existingUserWord, error: checkError } = await supabase
      .from('user_vocabulary')
      .select('id')
      .eq('user_id', user.id)
      .eq('vocabulary_word_id', vocabularyWordId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing word:', checkError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Database error while checking for duplicates' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingUserWord) {
      console.log('Word already exists in user vocabulary');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'already_exists',
        message: 'This word is already in your Word Book' 
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Add word to user's vocabulary
    const context = translationArray.length > 1 
      ? `Alternatives: ${translationArray.slice(1).join(', ')}`
      : null;

    const { data, error: insertError } = await supabase
      .from('user_vocabulary')
      .insert({
        user_id: user.id,
        vocabulary_word_id: vocabularyWordId,
        context: context
      })
      .select('id, saved_at')
      .single();

    if (insertError) {
      console.error('Error inserting user vocabulary:', insertError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to save word to your Word Book' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Successfully added word to book:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Word successfully added to your Word Book',
      data: {
        id: data.id,
        word: normalizedWord,
        created_at: data.saved_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in add-to-word-book function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});