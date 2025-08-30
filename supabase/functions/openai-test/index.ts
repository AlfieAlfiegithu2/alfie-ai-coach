import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Testing OpenAI API connectivity...');
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    console.log('🔑 API Keys status:', {
      hasOpenAI: !!openAIApiKey,
      openAILength: openAIApiKey?.length || 0,
      hasDeepSeek: !!deepSeekApiKey,
      deepSeekLength: deepSeekApiKey?.length || 0,
    });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Test OpenAI API with simple request
    console.log('📡 Making OpenAI API request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say "Hello, OpenAI API is working!" in exactly those words.' }
        ],
        max_tokens: 50,
      }),
    });

    console.log('📊 OpenAI Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', errorText);
      throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'No response content';
    
    console.log('✅ OpenAI API Test Success:', message);

    return new Response(JSON.stringify({ 
      success: true, 
      message,
      apiKeyStatus: 'valid',
      model: 'gpt-4o-mini'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ OpenAI Test Error:', error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      apiKeyStatus: 'invalid'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});