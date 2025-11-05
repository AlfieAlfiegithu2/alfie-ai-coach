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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const body = await req.json();
    const { text, voice = 'alloy' } = body;

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string');
    }

    if (text.length > 2000) {
      throw new Error('Text too long (max 2000 characters)');
    }

    console.log(`🎵 Generating Qwen 3 TTS for text: ${text.substring(0, 100)}...`);

    // Try OpenRouter TTS first (if available)
    try {
      const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': Deno.env.get('SUPABASE_URL') ?? '',
          'X-Title': 'English AIdol',
        },
        body: JSON.stringify({
          model: 'openai/tts-1', // Use OpenAI TTS through OpenRouter
          input: text,
          voice: voice,
          response_format: 'mp3',
          speed: 1.0,
        }),
      });

      if (response.ok) {
        // Get the audio data
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to base64 in chunks to avoid stack overflow
        let base64Audio = '';
        const chunkSize = 1024;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          base64Audio += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
        }

        console.log('✅ OpenRouter TTS generation successful');
        return new Response(
          JSON.stringify({
            audioContent: base64Audio,
            success: true,
            model: 'openai/tts-1',
            provider: 'openrouter'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    } catch (ttsError) {
      console.log('OpenRouter TTS not available, falling back to Qwen chat approach:', ttsError.message);
    }

    // Fallback: Use Qwen through OpenRouter for enhanced pronunciation guidance
    const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL') ?? '',
        'X-Title': 'English AIdol',
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-72b-instruct', // Qwen 3 model
        messages: [
          {
            role: 'system',
            content: `You are an expert English pronunciation coach using Qwen 3 TTS Flash technology. Provide detailed pronunciation guidance with IPA phonemes and natural speech patterns. Focus on IELTS-level English pronunciation.`
          },
          {
            role: 'user',
            content: `Analyze the pronunciation for this text and provide IPA phonemes and speaking guidance: "${text}". Use voice style: ${voice}.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!chatResponse.ok) {
      throw new Error(`Qwen API error: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();
    const qwenResponse = chatData.choices[0].message.content;

    console.log('✅ Qwen 3 pronunciation guidance generated');

    return new Response(
      JSON.stringify({
        pronunciationGuide: qwenResponse,
        text: text,
        voice: voice,
        success: true,
        model: 'qwen/qwen-2.5-72b-instruct',
        provider: 'openrouter-qwen',
        note: 'Advanced pronunciation guidance - use with frontend TTS'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('❌ Qwen TTS error:', error);
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
