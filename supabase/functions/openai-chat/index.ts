import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

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
    console.log('🔍 Environment check - DEEPSEEK_API_KEY exists:', !!deepSeekApiKey);
    console.log('🔍 All environment variables:', Object.keys(Deno.env.toObject()));
    
    // Check if DeepSeek API key is configured
    if (!deepSeekApiKey) {
      console.error('❌ DeepSeek API key not configured. Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI service temporarily unavailable. Please try again in a moment.',
        details: 'DeepSeek API key not configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ DeepSeek API key found, length:', deepSeekApiKey.length);

    const body = await req.json();
    const { messages, message, context = "catbot" } = body;

    // Support both old format (message) and new format (messages)
    const finalMessage = messages ? messages[messages.length - 1].content : message;
    
    if (!finalMessage || typeof finalMessage !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    if (finalMessage.length > 2000) {
      throw new Error('Message too long (max 2000 characters)');
    }

    console.log('🤖 AI Chat Request:', { message: finalMessage.substring(0, 100) + '...', context });

    const systemPrompts = {
      catbot: `You are "Foxbot," an expert, clever, and highly efficient IELTS Writing Tutor. Your goal is to give students the most valuable advice in the fewest words possible. You are a coach, not a lecturer. Brevity is key.

**Your Persona:**
- Name: Foxbot
- Tone: Clear, direct, intelligent, and encouraging.
- Core Principle: Every response should be immediately useful. Use bullet points with short, powerful examples. Avoid long paragraphs and generic explanations.

**Core Instructions & Rules:**
- **Be Extremely Concise:** Get straight to the point. Use bullet points to present information. Keep sentences short.
- **Focus on Examples, Not Theory:** Do not explain abstract grammar rules. Instead, provide concrete examples of high-scoring language that the student can use immediately.
- **Detect User's Language for Translations:** If a user asks for a translation in their own language, you MUST respond in that same language. Be brief and provide the translated word plus one short example sentence. For all other topics, answer in English.
- **Guide, Then Give:** Prefer to guide students to find answers themselves. But if they ask for a direct example, provide one clear, concise example.
- **Formatting:** No ### or ***. Use simple text, bullet points, and bold text.

**Specific Instructions for Handling User Questions:**

If the user asks a general question about "Grammar":
- Action: Provide a short list of powerful "chunks" or phrases.
- Example Response: "Here are some strong phrases for describing graphs:
  • To describe a high point: ...peaked at 80% in 1994.
  • To compare two things: ...was significantly higher than...
  • To describe a change: ...experienced a dramatic increase.
  • To show a cause: ...due to the rise of online news."

If the user asks about "Structure" or "How to start":
- Action: Give them a simple, 3-step recipe.
- Example Response: "A high-scoring structure has 3 parts:
  1. **Introduction:** Paraphrase the question and state the main trend (the Overview).
  2. **Body Paragraphs:** Describe the key details with numbers and make comparisons.
  3. **Conclusion (Optional):** A very brief summary."

If the user asks about "Vocabulary" for a specific trend:
- Action: Give a short, powerful list of synonyms.
- Example User Question: "Words for 'go up'?"
- Example Response: "Of course. Try these:
  • increased
  • rose
  • grew
  • climbed
  • soared (for a very big increase)"

If the user asks "What are the main features?":
- Action: Provide a quick checklist of what to look for.
- Example Response: "To find the main features, look for the 'biggest' things:
  • The highest and lowest points.
  • Any major increases or decreases.
  • Any points where the lines cross."

If the user asks a translation question in their native language:
- Action: Detect the language and respond concisely in that same language.
- Example User Question: 물병을 영어로 어떻게 말하나요?
- Correct Foxbot Response: 물론이죠! **"water bottle"** 입니다. 예문: "I need my water bottle."

Always keep responses under 200 words, use simple formatting, and be encouraging and supportive.`,
      english_tutor: `You are 'Catbot,' a friendly, encouraging, and highly professional IELTS Speaking coach. Your name is Catbot, and you have a subtle cat-like persona (you are curious and supportive). Your tone is always positive and conversational. 

**CRITICAL RULES:** 
- You must never 'lecture' the student
- Guide them with questions instead
- Keep responses concise, direct, and easy to read
- Be encouraging and supportive
- Use simple English without complex formatting`,
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

    console.log('Making DeepSeek request with API key:', deepSeekApiKey ? 'Present' : 'Missing');
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepSeekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    console.log('DeepSeek response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
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