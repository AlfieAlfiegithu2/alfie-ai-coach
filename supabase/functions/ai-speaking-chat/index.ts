// Supabase Edge Function: ai-speaking-chat
// Minimal, focused function for AI Speaking Tutor
// Handles audio input via OpenRouter/Gemini

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get OpenRouter API key
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    console.log('🔑 OpenRouter API key check:', { exists: !!openrouterApiKey, length: openrouterApiKey?.length });
    if (!openrouterApiKey) {
      // Return 200 with error details so Supabase client can read it
      return new Response(JSON.stringify({
        success: false,
        error: 'API key not configured',
        debug: 'OPENROUTER_API_KEY environment variable not found'
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      // Return 200 with error details so Supabase client can read it
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON',
        details: e instanceof Error ? e.message : String(e)
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const { message, audioBase64, audioMimeType = 'audio/webm' } = body;

    // Validate input
    if (!message && !audioBase64) {
      // Return 200 with error details so Supabase client can read it
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Message or audio required',
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Build content for OpenRouter
    const contentArray: any[] = [];
    
    if (audioBase64) {
      contentArray.push({
        type: 'text',
        text: message || 'Please listen to this audio and respond naturally as an English tutor.'
      });
      contentArray.push({
        type: 'image_url',
        image_url: {
          url: `data:${audioMimeType};base64,${audioBase64}`
        }
      });
    } else {
      contentArray.push({
        type: 'text',
        text: message
      });
    }

    // Call OpenRouter
    const openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    const response = await fetch(openrouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'Alfie AI Coach',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'You are English Tutora, an expert IELTS Speaking tutor. Keep responses SHORT (1-2 sentences, under 120 characters). Be conversational, encouraging, and provide immediate feedback.'
          },
          {
            role: 'user',
            content: contentArray
          }
        ],
        temperature: 0.8,
        max_tokens: 200,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('❌ OpenRouter API error:', response.status, errorData);
      
      // Return 200 with error details so Supabase client can read it
      return new Response(JSON.stringify({ 
        success: false, 
        error: `API error: ${response.status}`,
        details: errorData,
        statusCode: response.status
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('❌ Failed to parse OpenRouter response:', parseError);
      // Return 200 with error details so Supabase client can read it
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON response from API',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }
    
    console.log('📥 OpenRouter response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasContent: !!data.choices?.[0]?.message?.content
    });
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('❌ Invalid response format:', JSON.stringify(data).substring(0, 500));
      // Return 200 with error details so Supabase client can read it
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid response format',
        debug: data
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse,
    }), {
      headers: corsHeaders,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error:', errorMessage);
    
    // Return 200 with error details so Supabase client can read it
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      details: {
        name: error instanceof Error ? error.name : typeof error,
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
      }
    }), {
      status: 200,
      headers: corsHeaders,
    });
  }
});

