// @deno-types="https://deno.land/x/types/index.d.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore - Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno global
declare const Deno: any;

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY'); // Fallback

// Initialize Supabase client for caching
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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
    console.log('🔍 Environment check - OPENROUTER_API_KEY exists:', !!openRouterApiKey);
    console.log('🔍 Fallback DEEPSEEK_API_KEY exists:', !!deepSeekApiKey);
    
    // Check if OpenRouter API key is configured (primary)
    if (!openRouterApiKey && !deepSeekApiKey) {
      console.error('❌ No AI API key configured. Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI service temporarily unavailable. Please try again in a moment.',
        details: 'No AI API key configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const useOpenRouter = !!openRouterApiKey;
    console.log(`✅ Using ${useOpenRouter ? 'OpenRouter (Gemini 2.5 Flash Lite)' : 'DeepSeek (fallback)'} for AI chat`);

    const body = await req.json();
    const { messages, message, context = "catbot", imageContext, taskType, taskInstructions, skipCache = false } = body;

    // Support both old format (message) and new format (messages)
    const finalMessage = messages ? messages[messages.length - 1].content : message;
    
    if (!finalMessage || typeof finalMessage !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    if (finalMessage.length > 2000) {
      throw new Error('Message too long (max 2000 characters)');
    }

    console.log('🤖 AI Chat Request:', { message: finalMessage.substring(0, 100) + '...', context });

    // Create cache key for this request
    const cacheKey = `${context}-${finalMessage.toLowerCase().trim()}-${taskType || ''}-${taskInstructions?.slice(0, 50) || ''}`;
    
    let cachedResponse = null;

    // Only check cache if caching is not disabled
    if (!skipCache) {
      console.log('🔍 Checking cache for key:', cacheKey.slice(0, 50) + '...');
      const { data: cacheData } = await supabase
        .from('chat_cache')
        .select('response, hit_count')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle(); // Changed from .single() to .maybeSingle() for better performance
      cachedResponse = cacheData;
    } else {
      console.log('⏭️ Skipping cache check (skipCache=true)');
    }

    if (cachedResponse) {
      const cached = cachedResponse as any;
      console.log('🚀 Cache hit! Using cached response, hit count:', cached.hit_count);
      
      // Update hit count
      await supabase
        .from('chat_cache')
        .update({ 
          hit_count: (cached.hit_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('cache_key', cacheKey);

      return new Response(JSON.stringify({ 
        success: true, 
        response: cached.response,
        context: context,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('💨 Cache miss, calling DeepSeek API...');

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
    let apiMessages: any[] = [];
    
    if (messages && Array.isArray(messages)) {
      // New format with full conversation history
      apiMessages = messages as any[];
    } else {
      // Build context-aware system prompt
      let systemPrompt = systemPrompts[context as keyof typeof systemPrompts] || systemPrompts.general;
      
      // Add specific task context if available
      if (context === 'catbot' && (imageContext || taskType || taskInstructions)) {
        systemPrompt += `\n\n**CURRENT TASK CONTEXT:**`;
        
        if (taskType) {
          systemPrompt += `\nTask Type: ${taskType}`;
        }
        
        if (taskInstructions) {
          systemPrompt += `\nTask Instructions: "${taskInstructions}"`;
        }
        
        if (imageContext) {
          systemPrompt += `\nImage/Chart Description: "${imageContext}"`;
        }
        
        systemPrompt += `\n\nWhen students ask about vocabulary, grammar, or structure, provide advice SPECIFIC to this exact task and its content. Reference the task details in your response.`;
      }
      
      // Old format with single message
      apiMessages = [
        { 
          role: 'system', 
          content: systemPrompt
        } as any,
        { role: 'user', content: finalMessage } as any
      ];
    }

    // Analyze question complexity for dynamic token allocation
    const analyzeComplexity = (message: string) => {
      const wordCount = message.split(' ').length;
      const complexityKeywords = ['explain', 'example', 'structure', 'grammar', 'detailed', 'how to', 'why', 'describe'];
      const hasComplexityKeywords = complexityKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      if (wordCount > 50 || hasComplexityKeywords || message.includes('?')) {
        return { level: 'complex', tokens: 1200 };
      } else if (wordCount > 20 || message.length > 100) {
        return { level: 'medium', tokens: 1000 };
      } else {
        return { level: 'simple', tokens: 600 };
      }
    };

    const complexity = analyzeComplexity(finalMessage);
    console.log(`📊 Question complexity: ${complexity.level}, allocated tokens: ${complexity.tokens}`);
    
    let response;
    let apiProvider = 'unknown';
    
    if (useOpenRouter) {
      // Use OpenRouter with Gemini 2.5 Flash Lite
      console.log('💨 Calling OpenRouter API (Gemini 2.5 Flash Lite)...');
      apiProvider = 'openrouter-gemini';
      
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'English AI Coach',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: apiMessages,
          max_tokens: complexity.tokens,
          temperature: 0.5, // Lower temperature for faster, more deterministic responses
          stream: true, // Enable streaming for progressive responses
        }),
      });
    } else {
      // Fallback to DeepSeek
      console.log('💨 Calling DeepSeek API (fallback)...');
      apiProvider = 'deepseek';
      
      response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: apiMessages,
          max_tokens: complexity.tokens,
          temperature: 0.5, // Lower temperature for faster, more deterministic responses
        }),
      });
    }

    console.log(`${apiProvider} response status:`, response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${apiProvider} API error:`, errorText);
      throw new Error(`${apiProvider} API error: ${response.status} - ${errorText}`);
    }

    let aiResponse = '';
    let finishReason = 'stop';
    let wasTruncated = false;
    
    // Handle streaming response for OpenRouter/Gemini
    if (useOpenRouter && response.body) {
      console.log('📡 Processing streaming response...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  aiResponse += delta;
                }
                // Check for finish reason
                if (json.choices?.[0]?.finish_reason) {
                  finishReason = json.choices[0].finish_reason;
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
          try {
            const json = JSON.parse(buffer.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              aiResponse += delta;
            }
            if (json.choices?.[0]?.finish_reason) {
              finishReason = json.choices[0].finish_reason;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
        
        wasTruncated = finishReason === 'length';
        console.log(`✅ Streamed response complete: ${aiResponse.length} chars, finish_reason: ${finishReason}`);
      } catch (streamError) {
        console.error('❌ Streaming error:', streamError);
        // Fallback: try to parse as regular JSON
        const fallbackData = await response.json().catch(() => null);
        if (fallbackData?.choices?.[0]?.message?.content) {
          aiResponse = fallbackData.choices[0].message.content;
          finishReason = fallbackData.choices[0]?.finish_reason || 'stop';
          wasTruncated = finishReason === 'length';
        } else {
          throw streamError;
        }
      }
    } else {
      // Non-streaming response (DeepSeek fallback)
      const data = await response.json();
      const choice = data.choices[0];
      aiResponse = choice.message.content;
      finishReason = choice.finish_reason || 'stop';
      wasTruncated = finishReason === 'length';
    }
    
    console.log(`🔍 Response completion status: ${finishReason}, truncated: ${wasTruncated}`);
    console.log(`📏 Token usage - requested: ${complexity.tokens}, response length: ${aiResponse.length} chars`);
    
    if (wasTruncated) {
      console.log('⚠️ Response was truncated due to token limit');
      
      // Trim to last complete sentence to avoid mid-sentence cutoffs
      const sentences = aiResponse.split(/[.!?]/);
      if (sentences.length > 1) {
        // Remove the last incomplete sentence and rejoin
        sentences.pop();
        aiResponse = sentences.join('.') + '.';
        console.log('✂️ Trimmed to last complete sentence');
      }
      
      // Add continuation note for complex questions
      if (complexity.level === 'complex' && !aiResponse.includes('continue')) {
        aiResponse += '\n\n💬 Would you like me to continue with more details?';
      }
    }
    
    // Clean up formatting - remove ### and *** that shouldn't appear in student responses
    aiResponse = aiResponse
      .replace(/#{1,6}\s*/g, '')  // Remove all ### headers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')  // Remove *** bold formatting
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '**$1**')  // Convert * to ** for bold text
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Clean up excessive line breaks
      .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2')  // Add spacing between sentences
      .replace(/•\s*/g, '\n• ')  // Format bullet points
      // Fix numbered list spacing - remove excessive spaces around numbers
      .replace(/\n\s*(\d+\.)\s*\n\s*/g, '\n\n$1 ')  // Clean up numbered list formatting
      .replace(/\n(\d+\.)\s*/g, '\n$1 ')  // Ensure single space after numbers
      .trim();

    console.log('✅ AI Chat Response generated successfully');

    // Cache the response asynchronously (non-blocking) for future use
    // This doesn't block the response, improving perceived performance
    if (!skipCache) {
      // Fire-and-forget cache write - don't await it
      supabase
        .from('chat_cache')
        .insert({
          cache_key: cacheKey,
          response: aiResponse,
          task_context: [taskType, taskInstructions, imageContext].filter(Boolean).join(' | ') || null,
          hit_count: 1,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          metadata: {
            complexity_level: complexity.level,
            tokens_allocated: complexity.tokens,
            response_length: aiResponse.length,
            was_truncated: wasTruncated,
            finish_reason: finishReason,
            question_length: finalMessage.length
          }
        })
        .then(() => {
          console.log('💾 Response cached successfully (async)');
        })
        .catch((cacheError) => {
          console.warn('⚠️ Failed to cache response (non-blocking):', cacheError);
          // Don't fail the request if caching fails
        });
    } else {
      console.log('⏭️ Skipping response caching (skipCache=true)');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse,
      context: context,
      cached: false
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