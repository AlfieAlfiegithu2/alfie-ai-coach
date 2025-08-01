import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, context = "english_tutor" } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('🤖 AI Chat Request:', { message, context });

    const systemPrompts = {
      catbot: `You are 'Catbot,' a friendly, encouraging, and highly professional IELTS Writing tutor. Your tone is supportive and clear. You must never write the essay for the student. Instead, you will guide them by asking leading questions and providing structured advice. You must format all your responses using clean markdown, without using ### or ***. Use bolding for emphasis and bullet points for lists. Always provide specific, context-aware guidance based on the task they're working on.`,
      english_tutor: `You are an expert English tutor specializing in IELTS, PTE, and TOEFL preparation. You provide helpful, encouraging, and constructive feedback. Keep responses concise but informative. Focus on practical English learning tips, grammar explanations, and test strategies.`,
      translation: `You are a professional translator. Provide accurate translations and explain any cultural or contextual nuances when helpful.`,
      vocabulary: `You are a vocabulary expert. Provide clear definitions, usage examples, pronunciation guides, and memory tips for English words and phrases.`,
      general: `You are a helpful English learning assistant. Provide clear, encouraging, and practical advice for English learners of all levels.`
    };

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
            content: systemPrompts[context as keyof typeof systemPrompts] || systemPrompts.general
          },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('✅ AI Chat Response generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse,
      context: context
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in openai-chat function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});