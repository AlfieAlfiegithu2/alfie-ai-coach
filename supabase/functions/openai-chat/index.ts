// @deno-types="https://deno.land/x/types/index.d.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore - Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno global
declare const Deno: any;

const geminiApiKey = Deno.env.get('GEMINI_API_KEY'); // Fallback
const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY'); // Primary

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
    console.log('🔍 Environment check - DEEPSEEK_API_KEY exists:', !!deepSeekApiKey);
    console.log('🔍 Fallback GEMINI_API_KEY exists:', !!geminiApiKey);
    
    // Prefer DeepSeek as primary, fall back to Gemini
    if (!deepSeekApiKey && !geminiApiKey) {
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

    const useDeepSeek = !!deepSeekApiKey;
    const useGemini = !useDeepSeek && !!geminiApiKey;
    console.log(`✅ Using ${useDeepSeek ? 'DeepSeek V3.2 (primary)' : 'Gemini 2.5 Flash (fallback)'} for AI chat`);

    const body = await req.json();
    const { messages, message, context = "catbot", imageContext, taskType, taskInstructions, studentWriting, skipCache = false } = body;

    // Support both old format (message) and new format (messages)
    const finalMessage = messages ? messages[messages.length - 1].content : message;
    
    if (!finalMessage || typeof finalMessage !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    if (finalMessage.length > 2000) {
      throw new Error('Message too long (max 2000 characters)');
    }

    console.log('🤖 AI Chat Request:', { message: finalMessage.substring(0, 100) + '...', context });

    // Create cache key for this request (include student writing length to invalidate cache when they write more)
    const studentWritingLength = studentWriting ? studentWriting.trim().length : 0;
    const cacheKey = `${context}-${finalMessage.toLowerCase().trim()}-${taskType || ''}-${taskInstructions?.slice(0, 50) || ''}-${studentWritingLength}`;
    
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

    console.log(`💨 Cache miss, calling ${useDeepSeek ? 'DeepSeek' : 'OpenRouter' } API...`);

    const systemPrompts = {
      catbot: `You are "Catie," an expert IELTS Writing tutor (never call yourself Foxbot). You help students with SPECIFIC guidance for their actual writing task.

**Your Role:**
- Give TASK-SPECIFIC advice based on the actual task instructions provided
- If the student has written something, give feedback on THEIR writing
- Be concise but helpful (2-3 short paragraphs max)
- Use bullet points for lists
 - Keep total response under 180 words

**Response Guidelines:**

1. **For "How do I start?" questions:**
   - First, identify what TYPE of task it is from the instructions
   - Give ONE specific opening sentence EXAMPLE using the ACTUAL topic from their task
   - Example: "For this task about [topic from instructions], you could start with: '[specific paraphrase of the task topic]...'"

2. **For structure questions:**
   - Give a simple structure specific to their task type:
   - Task 1 (Data): Introduction (paraphrase + overview) → Body 1 (main trend) → Body 2 (details/comparisons)
   - Task 2 (Essay): Introduction (topic + thesis) → Body 1 (first argument) → Body 2 (second argument) → Conclusion

3. **For vocabulary/grammar help:**
   - Give 3-5 specific phrases they can use for THIS task
   - Show how to use them with examples related to their topic

4. **If they've written something:**
   - Point out 1-2 specific strengths
   - Suggest 1-2 specific improvements
   - Give an example of how to improve a specific sentence

5. **If they ask for an "example" or "intro":**
   - Always provide a concrete example sentence tailored to their task instructions
   - Keep it one or two sentences, directly about their topic

**Important:**
- ALWAYS reference the actual task topic in your advice
- Don't give generic advice - make it specific to their task
- Keep responses under 200 words
- Be encouraging!`,
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
      if (context === 'catbot' && (imageContext || taskType || taskInstructions || studentWriting)) {
        systemPrompt += `\n\n===== STUDENT'S ACTUAL TASK =====`;
        
        if (taskType) {
          systemPrompt += `\n**Task Type:** ${taskType}`;
        }
        
        if (taskInstructions) {
          systemPrompt += `\n\n**Task Instructions (what the student must write about):**\n"${taskInstructions}"`;
        }
        
        if (imageContext) {
          systemPrompt += `\n\n**Image/Chart Description:** "${imageContext}"`;
        }
        
        if (studentWriting && studentWriting.trim()) {
          const wordCount = studentWriting.trim().split(/\s+/).length;
          systemPrompt += `\n\n**Student's Current Writing (${wordCount} words):**\n"${studentWriting.substring(0, 1500)}${studentWriting.length > 1500 ? '...' : ''}"`;
        }
        
        systemPrompt += `\n\n===== END OF TASK =====\n\n**CRITICAL:** Your advice MUST be specific to this task. Reference the actual topic, scenario, or data from the task instructions above. If the student has written something, give specific feedback on their writing. Do NOT give generic IELTS advice.`;
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
    
    if (useDeepSeek) {
      // Primary: DeepSeek V3.2
      console.log('💨 Calling DeepSeek API (primary, V3.2)...');
      apiProvider = 'deepseek';
      
      response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-v3.2',
          messages: apiMessages,
          max_tokens: complexity.tokens,
          temperature: 0.5, // Lower temperature for faster, more deterministic responses
        }),
      });
    } else if (useGemini) {
      // Fallback: Gemini 2.5 Flash (Google AI API)
      console.log('💨 Calling Gemini 2.5 Flash (fallback)...');
      apiProvider = 'gemini';
      
      const geminiMessages = apiMessages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: complexity.tokens
          }
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
    
    // Non-streaming responses for both providers
    const data = await response.json();
    if (apiProvider === 'deepseek') {
      const choice = data.choices?.[0];
      aiResponse = choice?.message?.content || '';
      finishReason = choice?.finish_reason || 'stop';
      wasTruncated = finishReason === 'length';
    } else if (apiProvider === 'gemini') {
      aiResponse = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ') || '';
      finishReason = 'stop';
      wasTruncated = false;
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
      .replace(/_/g, ' ')  // Remove underscores to avoid markdown italics/spacing artifacts
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