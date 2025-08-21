import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice mapping from ElevenLabs to OpenAI
const voiceMapping = {
  // ElevenLabs default voice mappings to OpenAI voices
  '9BWtsMINqrJLrRacOk9x': 'nova', // Aria -> Nova (warm, engaging female)
  'CwhRBWXzGAHq8TQ4Fs17': 'onyx', // Roger -> Onyx (deep male)  
  'EXAVITQu4vr4xnSDxMaL': 'shimmer', // Sarah -> Shimmer (soft female)
  'FGY2WhTYpPnrIDTdsKH5': 'alloy', // Laura -> Alloy (neutral)
  'IKne3meq5aSn9XLyUdCD': 'echo', // Charlie -> Echo (male)
  'JBFqnCBsd6RMkjVDRZzb': 'fable', // George -> Fable (expressive male)
  // Default fallback
  'default': 'nova'
};

const mapVoice = (voiceId: string): string => {
  return voiceMapping[voiceId as keyof typeof voiceMapping] || voiceMapping.default;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Required environment variables not configured');
    }

    // Parse request - support both old ElevenLabs format and new format
    const { text, voice, voice_id, questionId, question_id } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    // Map ElevenLabs voice IDs to OpenAI voices
    const inputVoiceId = voice_id || voice || 'default';
    const mappedVoice = mapVoice(inputVoiceId);
    const cacheKey = question_id || questionId;

    console.log('TTS Request:', { 
      text: text.substring(0, 100), 
      originalVoice: inputVoiceId, 
      mappedVoice, 
      questionId: cacheKey 
    });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if audio already exists in cache
    if (cacheKey) {
      console.log(`🔍 Efficient Voice: Checking cache for question ${cacheKey}`);
      const { data: cached, error: cacheError } = await supabase
        .from('audio_cache')
        .select('audio_url')
        .eq('question_id', cacheKey)
        .eq('voice', mappedVoice)
        .single();

      if (!cacheError && cached?.audio_url) {
        console.log(`✅ Efficient Voice: Found cached audio for question ${cacheKey}, saving API costs!`);
        return new Response(
          JSON.stringify({ 
            audioContent: cached.audio_url,
            audio_url: cached.audio_url,
            cached: true,
            success: true 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    console.log(`🎵 Efficient Voice: Generating new audio with OpenAI TTS...`);

    // Generate speech from text using OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: mappedVoice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS API error: ${error}`);
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let base64Audio = '';
    const chunkSize = 1024;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64Audio += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }

    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;

    // Save to cache if questionId provided
    if (cacheKey) {
      console.log(`💾 Efficient Voice: Saving audio to cache for question ${cacheKey}`);
      const { error: saveError } = await supabase
        .from('audio_cache')
        .upsert({
          question_id: cacheKey,
          voice: mappedVoice,
          audio_url: audioDataUrl,
          text_hash: btoa(text), // Hash of the text for verification
          created_at: new Date().toISOString()
        });

      if (saveError) {
        console.error('Failed to cache audio:', saveError);
        // Continue anyway, don't fail the request
      } else {
        console.log(`✅ Efficient Voice: Audio cached successfully for reuse, reducing future API costs`);
      }
    }

    console.log('TTS generation and caching successful');

    return new Response(
      JSON.stringify({ 
        audioContent: audioDataUrl,
        audio_url: audioDataUrl,
        cached: false,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('TTS cache error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});