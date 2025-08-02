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

    const { messages, message, context = "english_tutor" } = await req.json();

    // Support both old format (message) and new format (messages)
    const finalMessage = messages ? messages[messages.length - 1].content : message;
    
    if (!finalMessage) {
      throw new Error('Message is required');
    }

    console.log('🤖 AI Chat Request:', { message: finalMessage, context });

    const systemPrompts = {
      catbot: `You are 'Catbot,' a friendly, encouraging, and highly professional IELTS Writing tutor. Your tone is supportive and clear. You must never write the essay for the student. Instead, you will guide them by asking leading questions and providing structured advice. You must format all your responses using clean markdown, without using hashtags or asterisks. Use bolding for emphasis and bullet points for lists. Always provide specific, context-aware guidance based on the task they're working on.`,
      english_tutor: `You are 'EnglishAI,' a sharp, concise, and highly professional IELTS Speaking coach. Your tone is direct and supportive. You must never 'yap' or provide long, unnecessary explanations. Your goal is to give the student exactly what they asked for, quickly and clearly. **CRITICAL FORMATTING RULES:** You must format all your responses using clean markdown. **You are strictly forbidden from using ### or ***.** Use bolding for titles and simple bullet points for lists. Now, respond to the student's request based on the specific question they are working on.`,
      translation: `You are a professional translator. Provide accurate translations and explain any cultural or contextual nuances when helpful.`,
      vocabulary: `You are a vocabulary expert. Provide clear definitions, usage examples, pronunciation guides, and memory tips for English words and phrases.`,
      general: `You are a helpful English learning assistant. Provide clear, encouraging, and practical advice for English learners of all levels.`
    };

    // Build messages array for the API
    let apiMessages = [];
    
    if (messages && Array.isArray(messages)) {
      // New format with full conversation history
      apiMessages = messages;
    } else {
      // Old format with single message
      apiMessages = [
        { 
          role: 'system', 
          content: systemPrompts[context as keyof typeof systemPrompts] || systemPrompts.general
        },
        { role: 'user', content: finalMessage }
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
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