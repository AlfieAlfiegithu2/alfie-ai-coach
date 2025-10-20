import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

// ElevenLabs voice IDs with accents
const ELEVENLABS_VOICES = {
  // US Accent
  '9BWtsMINqrJLrRacOk9x': { name: 'Rachel', accent: 'US', gender: 'Female' },
  'CwhRBWXzGAHq8TQ4Fs17': { name: 'Drew', accent: 'US', gender: 'Male' },
  'EXAVITQu4vr4xnSDxMaL': { name: 'Bella', accent: 'US', gender: 'Female' },
  'FGY2WhTYpPnrIDTdsKH5': { name: 'Antoni', accent: 'US', gender: 'Male' },
  'IKne3meq5aSn9XLyUdCD': { name: 'Elli', accent: 'US', gender: 'Female' },
  
  // UK Accent
  'JBFqnCBsd6RMkjVDRZzb': { name: 'Sarah', accent: 'UK', gender: 'Female' },
  'AZnzlk1XvdvUeBnXmlld': { name: 'Daniel', accent: 'UK', gender: 'Male' },
  
  // Australian Accent (using closest available voices)
  'pqHfZKP75CvOlQylNhV4': { name: 'Lily', accent: 'AUS', gender: 'Female' },
  'XB0fDUnXU5TFSJXzOQoQ': { name: 'Charlie', accent: 'AUS', gender: 'Male' },
  
  // Indian Accent (using closest available voices)
  'oWAxZDx7w5VEj9dCyTzz': { name: 'Grace', accent: 'IND', gender: 'Female' },
  'CYw3kZ02Hs0563khs1Fj': { name: 'Dave', accent: 'IND', gender: 'Male' },
  
  'default': 'JBFqnCBsd6RMkjVDRZzb' // Default to Sarah (UK)
};

// Voice selection by accent
const ACCENT_VOICES = {
  'US': ['9BWtsMINqrJLrRacOk9x', 'CwhRBWXzGAHq8TQ4Fs17', 'EXAVITQu4vr4xnSDxMaL'],
  'UK': ['JBFqnCBsd6RMkjVDRZzb', 'AZnzlk1XvdvUeBnXmlld'],
  'AUS': ['pqHfZKP75CvOlQylNhV4', 'XB0fDUnXU5TFSJXzOQoQ'],
  'IND': ['oWAxZDx7w5VEj9dCyTzz', 'CYw3kZ02Hs0563khs1Fj']
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] ElevenLabs TTS Request started`);

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Check environment variables with detailed logging
    const missingVars = [];
    if (!ELEVENLABS_API_KEY) missingVars.push('ELEVENLABS_API_KEY');
    if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    console.log(`[${requestId}] Environment check:`, {
      hasElevenLabs: !!ELEVENLABS_API_KEY,
      hasSupabase: !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY,
      missingVars
    });

    if (missingVars.length > 0) {
      const error = `Missing environment variables: ${missingVars.join(', ')}`;
      console.error(`[${requestId}] ${error}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error,
        debug: { missingVars, requestId }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request
    const { text, voice_id, accent, question_id } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    let voiceId = voice_id;
    
    // If accent is specified, randomly select a voice from that accent
    if (accent && ACCENT_VOICES[accent as keyof typeof ACCENT_VOICES]) {
      const accentVoices = ACCENT_VOICES[accent as keyof typeof ACCENT_VOICES];
      voiceId = accentVoices[Math.floor(Math.random() * accentVoices.length)];
    } else if (!voiceId) {
      voiceId = ELEVENLABS_VOICES.default;
    }

    const cacheKey = question_id || `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const voiceInfo = ELEVENLABS_VOICES[voiceId as keyof typeof ELEVENLABS_VOICES];

    console.log(`[${requestId}] ElevenLabs TTS Request:`, { 
      text: text.substring(0, 100), 
      voiceId,
      accent: voiceInfo?.accent || 'Unknown',
      voiceName: voiceInfo?.name || 'Unknown',
      gender: voiceInfo?.gender || 'Unknown',
      questionId: cacheKey 
    });

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if audio already exists in cache
    const { data: existingAudio, error: cacheError } = await supabase
      .from('audio_analytics')
      .select('audio_url, created_at')
      .eq('question_id', cacheKey)
      .eq('voice_id', voiceId)
      .single();

    if (!cacheError && existingAudio?.audio_url) {
      console.log(`[${requestId}] Cache hit for ${cacheKey}`);
      
      // Record cache hit
      await supabase.from('audio_analytics').insert({
        question_id: cacheKey,
        voice_id: voiceId,
        text: text.substring(0, 500),
        audio_url: existingAudio.audio_url,
        cache_hit: true,
        created_at: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          audio_url: existingAudio.audio_url,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate audio using ElevenLabs TTS
    console.log(`[${requestId}] Calling ElevenLabs API for voice ${voiceId}`);
    
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error(`[${requestId}] ElevenLabs API error:`, elevenLabsResponse.status, errorText);
      throw new Error(`ElevenLabs TTS failed: ${elevenLabsResponse.status} ${errorText}`);
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    
    // Convert to base64 for direct audio URL
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log(`[${requestId}] Generated ElevenLabs audio for ${cacheKey} (${audioBuffer.byteLength} bytes)`);

    // Record in analytics
    await supabase.from('audio_analytics').insert({
      question_id: cacheKey,
      voice_id: voiceId,
      text: text.substring(0, 500),
      audio_url: audioUrl,
      cache_hit: false,
      created_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        audio_url: audioUrl,
        cached: false,
        voice_used: ELEVENLABS_VOICES[voiceId as keyof typeof ELEVENLABS_VOICES] || 'Unknown'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ElevenLabs TTS error (${duration}ms):`, error);
    console.error(`[${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      duration,
      requestId,
      env_vars: {
        hasElevenLabs: !!Deno.env.get('ELEVENLABS_API_KEY'),
        hasSupabase: !!Deno.env.get('SUPABASE_URL'),
        hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      }
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        debug: {
          hasElevenLabs: !!Deno.env.get('ELEVENLABS_API_KEY'),
          missingVars: [
            !Deno.env.get('ELEVENLABS_API_KEY') && 'ELEVENLABS_API_KEY',
            !Deno.env.get('SUPABASE_URL') && 'SUPABASE_URL',
            !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') && 'SUPABASE_SERVICE_ROLE_KEY',
          ].filter(Boolean),
          requestId,
          duration
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});