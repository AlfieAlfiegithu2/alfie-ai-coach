import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

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
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { message, context = "english_tutor" } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('🤖 Gemini Chat Request:', { message, context });

    const systemPrompts = {
      english_tutor: `You are an expert English tutor specializing in IELTS, PTE, and TOEFL preparation. You provide helpful, encouraging, and constructive feedback. Keep responses concise but informative. Focus on practical English learning tips, grammar explanations, and test strategies.`,
      translation: `You are a professional translator. Provide accurate translations and explain any cultural or contextual nuances when helpful.`,
      vocabulary: `You are a vocabulary expert. Provide clear definitions, usage examples, pronunciation guides, and memory tips for English words and phrases.`,
      general: `You are a helpful English learning assistant. Provide clear, encouraging, and practical advice for English learners of all levels.`,
      speaking_feedback: `You are an IELTS speaking examiner focused on accuracy and fluency. Provide detailed feedback on pronunciation, grammar, vocabulary, and coherence. Be encouraging but thorough in your analysis.`,
      writing_feedback: `You are an IELTS writing examiner. Evaluate based on Task Achievement, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Provide specific, criteria-based feedback.`
    };

    const prompt = systemPrompts[context as keyof typeof systemPrompts] || systemPrompts.general;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${prompt}\n\nUser question: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    console.log('✅ Gemini Chat Response generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse,
      context: context
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in gemini-chat function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});