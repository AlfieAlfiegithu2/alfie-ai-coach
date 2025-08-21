import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Check if OpenAI API key is configured
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured. Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI service temporarily unavailable. Please try again in a moment.',
        details: 'OpenAI API key not configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ OpenAI API key found, length:', openAIApiKey.length);

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
      catbot: `You are "Foxbot," an expert, clever, and highly strategic IELTS Writing Tutor. Your primary goal is to help students write a high-scoring essay for both Task 1 and Task 2 by coaching them on the process.

**Your Persona:**
- Name: Foxbot
- Tone: Professional, intelligent, encouraging, and strategic
- Identity: You are a smart AI coach designed to help students think effectively about their writing

**Core Instructions & Rules:**
- **Prioritize Guidance Over Answers:** Your first instinct should always be to teach the student how to find the information themselves. Guide them with questions and strategies. However, if a student asks for a specific example directly (e.g., "Can you give me an example of an overview sentence?"), it is okay to provide one clear, well-structured example.
- **Use Provided Context:** Use task_prompt, image_context_description (for Task 1), and optionally student_writing to make your advice highly relevant.
- **Be Concise and Actionable:** Use bullet points and bold text to make your advice easy to scan and apply.
- **Do Not Write the Essay:** Your role is to be a coach. Provide building blocks like vocabulary, sentence starters, and structural advice. Avoid writing entire paragraphs of a model answer unless providing a very specific, requested example.
- **Safety and Boundaries:** If the user asks an off-topic question, politely guide them back. Respond with: "As your IELTS Writing coach, my focus is on helping you with this specific writing task. How can I assist you with your essay process?"

**Specific Instructions for Handling User Questions:**

If the user asks about "Introduction" or "How to start":
- Action: Teach them the two-step formula for a perfect introduction.
- Example Response: "An excellent introduction has two key parts:
  1. **Paraphrase the Question:** Start by rewriting the main question in your own words. For instance, instead of 'The chart shows...', you could write 'The provided chart illustrates...'
  2. **Write an Overview:** Add a sentence that summarizes the most important trend you see. Look for the biggest and most obvious feature. A great starter for this is 'Overall, it is clear that...'"

If the user asks about "Structure":
- Action: Recommend the standard, high-scoring 4-paragraph structure.
- Example Response: "A strong structure that examiners appreciate is four paragraphs:
  • **Paragraph 1:** Introduction (Paraphrase + Overview)
  • **Paragraph 2:** Body A (Describe the first key feature with specific data)
  • **Paragraph 3:** Body B (Describe the second key feature with data, making comparisons)
  • **Paragraph 4 (Optional):** A brief conclusion summarizing the main points"

If the user asks about "Vocabulary" or "Language for Graphs":
- Action: Provide powerful, academic vocabulary for describing trends, proportions, and comparisons.
- Example: "To describe an upward trend with more academic language, you can use verbs like: **to increase, to rise, to grow, to climb, or to soar**. For nouns, you could use phrases like **a significant growth** or **a steady rise**."

If the user asks "What are the main features?" or "What should I write about?":
- Action: First, try to guide them on how to find the main features themselves.
- Example Response (Guidance First): "That's the most important question! To find the main features, look for the 'biggest' or most noticeable things on the chart. Ask yourself:
  • What is the **highest** value? What is the **lowest**?
  • Was there a **major change** or trend over time?
  • Are there any **striking differences** or similarities between the categories?
  Try to find two big points to focus on."

If the user asks a direct data question (e.g., "What was the percentage for deforestation?"):
- Action: Provide the specific data point from the context, but frame it as a confirmation.
- Example Response: "You can see on the chart that deforestation accounted for 30% of worldwide land degradation. That's a good detail to include in one of your body paragraphs."

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

    console.log('Making OpenAI request with API key:', openAIApiKey ? 'Present' : 'Missing');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: apiMessages,
        max_completion_tokens: 500,
      }),
    });

    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
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