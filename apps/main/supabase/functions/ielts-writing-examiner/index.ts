// @ts-nocheck - Deno runtime file, TypeScript errors for Deno imports/globals are expected
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-expect-error - Deno std library import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Phase 2: Generate deterministic seed from text content
function createSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive number (max 2^31 - 1)
  return Math.abs(hash) % 2147483647;
}

async function callGemini(prompt: string, apiKey: string, seed: number, retryCount = 0) {
  console.log(`🚀 Attempting Gemini API call (attempt ${retryCount + 1}/2) with seed ${seed}...`);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          seed: seed, // Phase 2: Add deterministic seed
          maxOutputTokens: 8000, // Increased for comprehensive IELTS analysis
          topP: 0.9,
          topK: 50
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', errorText);
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Gemini API call successful');
    return data;
  } catch (error) {
    console.error(`❌ Gemini attempt ${retryCount + 1} failed:`, error.message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying Gemini API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callGemini(prompt, apiKey, seed, retryCount + 1);
    }
    
    throw error;
  }
}

async function callOpenAI(prompt: string, apiKey: string, seed: number, retryCount = 0) {
  console.log(`🚀 Attempting OpenAI API call (attempt ${retryCount + 1}/2) with seed ${seed}...`);
  
  try {
    // @ts-expect-error - Deno global is available at runtime
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert IELTS examiner with 15+ years of experience. You follow official IELTS band descriptors precisely and provide accurate, evidence-based scoring. You MUST return ONLY a valid JSON object with no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Phase 1: Add low temperature for consistency
        seed: seed, // Phase 2: Add deterministic seed
        response_format: { type: 'json_object' },
        max_completion_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', errorText);
      throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ OpenAI API call successful (model: ${model})`);
    return data;
  } catch (error) {
    console.error(`❌ OpenAI attempt ${retryCount + 1} failed:`, (error as any).message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying OpenAI API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callOpenAI(prompt, apiKey, seed, retryCount + 1);
    }
    
    throw error;
  }
}

async function callGeminiViaOpenRouter(prompt: string, apiKey: string, seed: number, retryCount = 0) {
  console.log(`🚀 Attempting Gemini 2.5 Flash API call via OpenRouter (attempt ${retryCount + 1}/2) with seed ${seed}...`);
  try {
    // Add timeout to prevent hanging (50 seconds - Supabase edge functions have 60s limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'IELTS Writing Examiner'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an expert IELTS examiner with 15+ years of experience. You follow official IELTS band descriptors precisely and provide accurate, evidence-based scoring. You MUST return ONLY a valid JSON object with no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          seed: seed, // Phase 2: Add deterministic seed
          max_tokens: 8000
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini 2.5 Flash (OpenRouter) API Error:', errorText);
        throw new Error(`Gemini 2.5 Flash (OpenRouter) API failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Gemini 2.5 Flash (OpenRouter) API call successful`);
      
      // Extract content from response (OpenRouter format)
      const content = data.choices?.[0]?.message?.content ?? '';
      
      // Return in a format compatible with existing code
      return {
        choices: [{
          message: {
            content: content
          }
        }]
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('OpenRouter API request timeout (60s exceeded)');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error(`❌ Gemini 2.5 Flash (OpenRouter) attempt ${retryCount + 1} failed:`, (error as any).message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying Gemini 2.5 Flash (OpenRouter) API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callGeminiViaOpenRouter(prompt, apiKey, seed, retryCount + 1);
    }
    
    throw error;
  }
}

async function callDeepSeek(prompt: string, apiKey: string, seed: number, retryCount = 0) {
  console.log(`🚀 Attempting DeepSeek API call (attempt ${retryCount + 1}/2) with seed ${seed}...`);
  try {
    // @ts-expect-error - Deno global is available at runtime
    const model = Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-reasoner';
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an expert IELTS examiner. Return ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Phase 1: Add low temperature for consistency
        seed: seed, // Phase 2: Add deterministic seed
        max_tokens: 4000
      })
    });
    if (!response.ok) {
      const t = await response.text();
      console.error('❌ DeepSeek API Error:', t);
      throw new Error(`DeepSeek API failed: ${response.status} - ${t}`);
    }
    const data = await response.json();
    console.log(`✅ DeepSeek API call successful (model: ${model})`);
    return data;
  } catch (error) {
    console.error(`❌ DeepSeek attempt ${retryCount + 1} failed:`, (error as any).message);
    if (retryCount < 1) {
      console.log('🔄 Retrying DeepSeek API call in 500ms...');
      await new Promise(r => setTimeout(r, 500));
      return callDeepSeek(prompt, apiKey, seed, retryCount + 1);
    }
    throw error;
  }
}

async function callKimiK2Thinking(prompt: string, apiKey: string, seed: number, retryCount = 0) {
  console.log(`🚀 Attempting Kimi K2 Thinking API call via OpenRouter (attempt ${retryCount + 1}/2) with seed ${seed}...`);
  try {
    // Add timeout to prevent hanging (50 seconds - Supabase edge functions have 60s limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'IELTS Writing Examiner'
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-thinking',
          messages: [
            {
              role: 'system',
              content: 'You are an expert IELTS examiner with 15+ years of experience. You follow official IELTS band descriptors precisely and provide accurate, evidence-based scoring. You MUST return ONLY a valid JSON object with no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          seed: seed,
          max_tokens: 8000
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Kimi K2 Thinking (OpenRouter) API Error:', errorText);
        throw new Error(`Kimi K2 Thinking (OpenRouter) API failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Kimi K2 Thinking (OpenRouter) API call successful`);
      
      // Extract content from response (OpenRouter format)
      const content = data.choices?.[0]?.message?.content ?? '';
      
      // Return in a format compatible with existing code
      return {
        choices: [{
          message: {
            content: content
          }
        }]
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('OpenRouter API request timeout (60s exceeded)');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error(`❌ Kimi K2 Thinking (OpenRouter) attempt ${retryCount + 1} failed:`, (error as any).message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying Kimi K2 Thinking (OpenRouter) API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callKimiK2Thinking(prompt, apiKey, seed, retryCount + 1);
    }
    
    throw error;
  }
}

async function callGPT51ViaOpenRouter(prompt: string, apiKey: string, seed: number, retryCount = 0) {
  console.log(`🚀 Attempting GPT-5.1 API call via OpenRouter (attempt ${retryCount + 1}/2) with seed ${seed}...`);
  try {
    // Add timeout to prevent hanging (50 seconds - Supabase edge functions have 60s limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://englishaidol.com',
          'X-Title': 'IELTS Writing Examiner'
        },
        body: JSON.stringify({
          model: 'openai/gpt-5.1',
          messages: [
            {
              role: 'system',
              content: 'You are an expert IELTS examiner with 15+ years of experience. You follow official IELTS band descriptors precisely and provide accurate, evidence-based scoring. You MUST return ONLY a valid JSON object with no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          seed: seed, // Phase 2: Add deterministic seed
          max_tokens: 8000
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ GPT-5.1 (OpenRouter) API Error:', errorText);
        throw new Error(`GPT-5.1 (OpenRouter) API failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ GPT-5.1 (OpenRouter) API call successful`);
      
      // Extract content from response (OpenRouter format)
      const content = data.choices?.[0]?.message?.content ?? '';
      
      // Return in a format compatible with existing code
      return {
        choices: [{
          message: {
            content: content
          }
        }]
      };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('OpenRouter API request timeout (60s exceeded)');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error(`❌ GPT-5.1 (OpenRouter) attempt ${retryCount + 1} failed:`, (error as any).message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying GPT-5.1 (OpenRouter) API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callGPT51ViaOpenRouter(prompt, apiKey, seed, retryCount + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task1Answer, task2Answer, task1Data, task2Data, apiProvider = 'gemini', targetLanguage, model } = await req.json();

    // Determine training type from task1Data
    const trainingType = task1Data?.trainingType || 'Academic';

    // @ts-expect-error - Deno global is available at runtime
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    // @ts-expect-error - Deno global is available at runtime
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    // @ts-expect-error - Deno global is available at runtime
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Gemini 2.5 Flash via OpenRouter is now the primary model
    console.log('🔑 API Keys check:', {
      hasOpenRouter: !!openRouterApiKey,
      openRouterKeyLength: openRouterApiKey?.length || 0,
      hasGemini: !!geminiApiKey,
      hasOpenAI: !!openaiApiKey,
      apiProvider
    });
    
    if (!openRouterApiKey) {
      console.warn('⚠️ No OpenRouter API key found, will fallback to direct Gemini/OpenAI');
    } else {
      console.log('✅ OpenRouter API key found, will use Gemini 2.5 Flash (OpenRouter) as primary');
    }
    
    if (apiProvider === 'gemini' && !geminiApiKey) {
      console.error('❌ No Gemini API key found');
      throw new Error('Gemini API key is required');
    }
    
    if (apiProvider === 'openai' && !openaiApiKey) {
      console.error('❌ No OpenAI API key found');
      throw new Error('OpenAI API key is required');
    }

    // Allow single task submissions - check for meaningful content
    const hasTask1 = task1Answer && task1Answer.trim() !== '' && task1Answer !== 'Not completed';
    const hasTask2 = task2Answer && task2Answer.trim() !== '' && task2Answer !== 'Not completed';
    
    if (!hasTask1 && !hasTask2) {
      throw new Error('At least one task answer is required');
    }

    console.log('🔍 AI Examiner Request:', { 
      task1Length: task1Answer?.length || 0,
      task2Length: task2Answer?.length || 0,
      hasTask1,
      hasTask2,
      targetLanguage: targetLanguage || 'en',
      model: model || 'gemini-2.5-flash'
    });

    // Language instruction for translation
    const languageInstruction = targetLanguage ? `
IMPORTANT LANGUAGE INSTRUCTION:
You MUST provide all feedback, explanations, justifications, and improvement descriptions in ${targetLanguage === 'zh' ? 'Chinese (中文)' : targetLanguage === 'es' ? 'Spanish (Español)' : targetLanguage === 'fr' ? 'French (Français)' : targetLanguage === 'de' ? 'German (Deutsch)' : targetLanguage === 'ja' ? 'Japanese (日本語)' : targetLanguage === 'ko' ? 'Korean (한국어)' : targetLanguage === 'ar' ? 'Arabic (العربية)' : targetLanguage === 'pt' ? 'Portuguese (Português)' : targetLanguage === 'ru' ? 'Russian (Русский)' : targetLanguage === 'hi' ? 'Hindi (हिन्दी)' : targetLanguage === 'vi' ? 'Vietnamese (Tiếng Việt)' : 'English'}.

CRITICAL: Keep the following in ENGLISH:
- The student's original writing (task1Answer and task2Answer)
- All quoted text from the student's writing in the "original" field
- Your improved versions in the "improved" field
- IELTS terminology (e.g., "Task Achievement", "Coherence and Cohesion", "Lexical Resource", "Grammatical Range and Accuracy", "Band Score")
- Technical terms like "IELTS", "Task 1", "Task 2"

TRANSLATE to ${targetLanguage === 'zh' ? 'Chinese' : targetLanguage === 'es' ? 'Spanish' : targetLanguage === 'fr' ? 'French' : targetLanguage === 'de' ? 'German' : targetLanguage === 'ja' ? 'Japanese' : targetLanguage === 'ko' ? 'Korean' : targetLanguage === 'ar' ? 'Arabic' : targetLanguage === 'pt' ? 'Portuguese' : targetLanguage === 'ru' ? 'Russian' : targetLanguage === 'hi' ? 'Hindi' : targetLanguage === 'vi' ? 'Vietnamese' : 'English'}:
- All justifications
- All explanations
- All feedback text
- Improvement descriptions (the "explanation" field)
- Strengths and areas for improvement
- General guidance and advice

Example for Chinese:
- justification: "学生在任务完成方面表现良好，提供了相关的信息..." (in Chinese)
- explanation: "使用更学术性的词汇如'illustrates'和'substantial growth'而不是简单的词汇..." (in Chinese)
- But keep: original: "The graph shows a big increase in sales." (in English)
- And keep: improved: "The provided chart illustrates a substantial growth in sales revenue." (in English)
` : '';

    const masterExaminerPrompt = `Core Principles & Directives
${languageInstruction}

You are an expert IELTS examiner and writing coach. You must adhere to the following core principles at all times.

1. Preserve the Student's Original Ideas and Arguments:
This is your most important rule. You must never change the core meaning, opinion, or arguments of the student's essay.
Your role is to improve how the ideas are expressed, not what the ideas are. You will elevate their language, grammar, and structure, but the student's original voice and perspective must remain intact.

2. Implement Precise, Word-for-Word Highlighting:
When you generate the sentence_comparisons and the improvements array, your feedback must be granular.
For the side-by-side correction view, you will generate original_spans and corrected_spans. In these arrays, you must isolate and tag only the specific words or short phrases that have been changed. Do not highlight entire sentences if only a few words were improved. This precision is essential.

Your Role and Core Instruction:

You are an expert IELTS examiner with 15+ years of experience. Your task is to provide a comprehensive, fair, and accurate assessment of an IELTS Writing submission (both Task 1 and Task 2).

Your entire analysis must be based on the Official IELTS Band Descriptors provided below. You will first form a holistic, overall impression of the work, and then you will use the specific criteria to justify your scores.

CRITICAL: You must be STRICT and ACCURATE in your scoring. Do not inflate scores out of kindness or optimism. If the writing demonstrates basic errors, limited vocabulary, or poor organization, score accordingly. A 6.5 should represent genuinely good writing, not average writing. Be honest and objective - this helps students understand their true level and areas for improvement.

You must perform all analysis yourself. Your expert judgment is the only thing that matters.

Official IELTS Band Descriptors (Complete 0-9 Scale)

Task Achievement (Task 1) / Task Response (Task 2):
${trainingType === 'General' || trainingType === 'Academic' ? `**For Task 1 (Updated May 2023):**

9: All the requirements of the task are fully and appropriately satisfied. There may be extremely rare lapses in content.

8: The response covers all the requirements of the task appropriately, relevantly and sufficiently. There may be occasional omissions or lapses in content.
(Academic) Key features are skilfully selected, and clearly presented, highlighted and illustrated.
(General Training) All bullet points are clearly presented, and appropriately illustrated or extended.

7: The response covers the requirements of the task. The content is relevant and accurate – there may be a few omissions or lapses. The format is appropriate.
(Academic) Key features which are selected are covered and clearly highlighted but could be more fully or more appropriately illustrated or extended.
(Academic) It presents a clear overview, the data are appropriately categorised, and main trends or differences are identified.
(General Training) All bullet points are covered and clearly highlighted but could be more fully or more appropriately illustrated or extended. It presents a clear purpose. The tone is consistent and appropriate to the task. Any lapses are minimal.

6: The response focuses on the requirements of the task and an appropriate format is used. Some irrelevant, inappropriate or inaccurate information may occur in areas of detail or when illustrating or extending the main points. Some details may be missing (or excessive) and further extension or illustration may be needed.
(Academic) Key features which are selected are covered and adequately highlighted. A relevant overview is attempted. Information is appropriately selected and supported using figures/data.
(General Training) All bullet points are covered and adequately highlighted. The purpose is generally clear. There may be minor inconsistencies in tone.

5: The response generally addresses the requirements of the task. The format may be inappropriate in places. There may be a tendency to focus on details (without referring to the bigger picture). The inclusion of irrelevant, inappropriate or inaccurate material in key areas detracts from the task achievement. There is limited detail when extending and illustrating the main points.
(Academic) Key features which are selected are not adequately covered. The recounting of detail is mainly mechanical. There may be no data to support the description.
(General Training) All bullet points are presented but one or more may not be adequately covered. The purpose may be unclear at times. The tone may be variable and sometimes inappropriate.

4: The response is an attempt to address the task. The format may be inappropriate. Key features/bullet points which are presented may be irrelevant, repetitive, inaccurate or inappropriate.
(Academic) Few key features have been selected.
(General Training) Not all bullet points are presented.
(General Training) The purpose of the letter is not clearly explained and may be confused. The tone may be inappropriate.

3: The response does not address the requirements of the task (possibly because of misunderstanding of the data/diagram/situation). Key features/bullet points which are presented may be largely irrelevant. Limited information is presented, and this may be used repetitively.

2: The content barely relates to the task.

1: Responses of 20 words or fewer are rated at Band 1. The content is wholly unrelated to the task. Any copied rubric must be discounted.

0: Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English throughout, or where there is proof that a candidate's answer has been totally memorized.

**For Task 2 (Essay) - Applies to both Academic and General Training:**
` : ''}9: The prompt is appropriately addressed and explored in depth. A clear and fully developed position is presented which directly answers the question/s. Ideas are relevant, fully extended and well supported. Any lapses in content or support are extremely rare.

8: The prompt is appropriately and sufficiently addressed. A clear and well-developed position is presented in response to the question/s. Ideas are relevant, well extended and supported. There may be occasional omissions or lapses in content.

7: The main parts of the prompt are appropriately addressed. A clear and developed position is presented. Main ideas are extended and supported but there may be a tendency to over-generalise or there may be a lack of focus and precision in supporting ideas/material.

6: The main parts of the prompt are addressed (though some may be more fully covered than others). An appropriate format is used. A position is presented that is directly relevant to the prompt, although the conclusions drawn may be unclear, unjustified or repetitive. Main ideas are relevant, but some may be insufficiently developed or may lack clarity, while some supporting arguments and evidence may be less relevant or inadequate.

5: The main parts of the prompt are incompletely addressed. The format may be inappropriate in places. The writer expresses a position, but the development is not always clear. Some main ideas are put forward, but they are limited and are not sufficiently developed and/or there may be irrelevant detail. There may be some repetition.

4: The prompt is tackled in a minimal way, or the answer is tangential, possibly due to some misunderstanding of the prompt. The format may be inappropriate. A position is discernible, but the reader has to read carefully to find it. Main ideas are difficult to identify and such ideas that are identifiable may lack relevance, clarity and/or support. Large parts of the response may be repetitive.

3: No part of the prompt is adequately addressed, or the prompt has been misunderstood. No relevant position can be identified, and/or there is little direct response to the question/s. There are few ideas, and these may be irrelevant or insufficiently developed.

2: The content is barely related to the prompt. No position can be identified. There may be glimpses of one or two ideas without development.

1: Responses of 20 words or fewer are rated at Band 1. The content is wholly unrelated to the prompt. Any copied rubric must be discounted.

0: Should only be used where a candidate did not attend or attempt the question in any way, used a language other than English throughout, or where there is proof that a candidate's answer has been totally memorized.

Coherence & Cohesion (Applies to both Academic and General Training, Task 1 and Task 2):
9: The message can be followed effortlessly. Cohesion is used in such a way that it very rarely attracts attention. Any lapses in coherence or cohesion are minimal. Paragraphing is skilfully managed.

8: The message can be followed with ease. Information and ideas are logically sequenced, and cohesion is well managed. Occasional lapses in coherence and cohesion may occur. Paragraphing is used sufficiently and appropriately.

7: Information and ideas are logically organised, and there is a clear progression throughout the response. (A few lapses may occur, but these are minor.) A range of cohesive devices including reference and substitution is used flexibly but with some inaccuracies or some over/under use. Paragraphing is generally used effectively to support overall coherence, and the sequencing of ideas within a paragraph is generally logical.

6: Information and ideas are generally arranged coherently and there is a clear overall progression. Cohesive devices are used to some good effect but cohesion within and/or between sentences may be faulty or mechanical due to misuse, overuse or omission. The use of reference and substitution may lack flexibility or clarity and result in some repetition or error. Paragraphing may not always be logical and/or the central topic may not always be clear.

5: Organisation is evident but is not wholly logical and there may be a lack of overall progression. Nevertheless, there is a sense of underlying coherence to the response. The relationship of ideas can be followed but the sentences are not fluently linked to each other. There may be limited/overuse of cohesive devices with some inaccuracy. The writing may be repetitive due to inadequate and/or inaccurate use of reference and substitution. Paragraphing may be inadequate or missing.

4: Information and ideas are evident but not arranged coherently and there is no clear progression within the response. Relationships between ideas can be unclear and/or inadequately marked. There is some use of basic cohesive devices, which may be inaccurate or repetitive. There is inaccurate use or a lack of substitution or referencing. There may be no paragraphing and/or no clear main topic within paragraphs.

3: There is no apparent logical organisation. Ideas are discernible but difficult to relate to each other. There is minimal use of sequencers or cohesive devices. Those used do not necessarily indicate a logical relationship between ideas. There is difficulty in identifying referencing. Any attempts at paragraphing are unhelpful.

2: There is little relevant message, or the entire response may be off-topic. There is little evidence of control of organisational features.

1: Responses of 20 words or fewer are rated at Band 1. The writing fails to communicate any message and appears to be by a virtual non-writer.

0: Should only be used where a candidate did not attend or attempt the question in any way.

Lexical Resource (Applies to both Academic and General Training, Task 1 and Task 2):
9: Full flexibility and precise use are widely evident. A wide range of vocabulary is used accurately and appropriately with very natural and sophisticated control of lexical features. Minor errors in spelling and word formation are extremely rare and have minimal impact on communication.

8: A wide resource is fluently and flexibly used to convey precise meanings. There is skilful use of uncommon and/or idiomatic items when appropriate, despite occasional inaccuracies in word choice and collocation. Occasional errors in spelling and/or word formation may occur, but have minimal impact on communication.

7: The resource is sufficient to allow some flexibility and precision. There is some ability to use less common and/or idiomatic items. An awareness of style and collocation is evident, though inappropriacies occur. There are only a few errors in spelling and/or word formation and they do not detract from overall clarity.

6: The resource is generally adequate and appropriate for the task. The meaning is generally clear in spite of a rather restricted range or a lack of precision in word choice. If the writer is a risk-taker, there will be a wider range of vocabulary used but higher degrees of inaccuracy or inappropriacy. There are some errors in spelling and/or word formation, but these do not impede communication.

5: The resource is limited but minimally adequate for the task. Simple vocabulary may be used accurately but the range does not permit much variation in expression. There may be frequent lapses in the appropriacy of word choice, and a lack of flexibility is apparent in frequent simplifications and/or repetitions. Errors in spelling and/or word formation may be noticeable and may cause some difficulty for the reader.

4: The resource is limited and inadequate for or unrelated to the task. Vocabulary is basic and may be used repetitively. There may be inappropriate use of lexical chunks (e.g. memorised phrases, formulaic language and/or language from the input material). Inappropriate word choice and/or errors in word formation and/or in spelling may impede meaning.

3: The resource is inadequate (which may be due to the response being significantly underlength). Possible over-dependence on input material or memorised language. Control of word choice and/or spelling is very limited, and errors predominate. These errors may severely impede meaning.

2: The resource is extremely limited with few recognisable strings, apart from memorised phrases. There is no apparent control of word formation and/or spelling.

1: Responses of 20 words or fewer are rated at Band 1. No resource is apparent, except for a few isolated words.

0: Should only be used where a candidate did not attend or attempt the question in any way.

Grammatical Range and Accuracy (Applies to both Academic and General Training, Task 1 and Task 2):
9: A wide range of structures is used with full flexibility and control. Punctuation and grammar are used appropriately throughout. Minor errors are extremely rare and have minimal impact on communication.

8: A wide range of structures is flexibly and accurately used. The majority of sentences are error-free, and punctuation is well managed. Occasional, non-systematic errors and inappropriacies occur, but have minimal impact on communication.

7: A variety of complex structures is used with some flexibility and accuracy. Grammar and punctuation are generally well controlled, and error-free sentences are frequent. A few errors in grammar may persist, but these do not impede communication.

6: A mix of simple and complex sentence forms is used but flexibility is limited. Examples of more complex structures are not marked by the same level of accuracy as in simple structures. Errors in grammar and punctuation occur, but rarely impede communication.

5: The range of structures is limited and rather repetitive. Although complex sentences are attempted, they tend to be faulty, and the greatest accuracy is achieved on simple sentences. Grammatical errors may be frequent and cause some difficulty for the reader. Punctuation may be faulty.

4: A very limited range of structures is used. Subordinate clauses are rare and simple sentences predominate. Some structures are produced accurately but grammatical errors are frequent and may impede meaning. Punctuation is often faulty or inadequate.

3: Sentence forms are attempted, but errors in grammar and punctuation predominate (except in memorised phrases or those taken from the input material). This prevents most meaning from coming through. Length may be insufficient to provide evidence of control of sentence forms.

2: There is little or no evidence of sentence forms (except in memorised phrases).

1: Responses of 20 words or fewer are rated at Band 1. No rateable language is evident.

0: Should only be used where a candidate did not attend or attempt the question in any way.

Your Required Tasks & Output Format

${hasTask1 && hasTask2 ? 'After analyzing the provided Task 1 and Task 2 essays, you must return a single, valid JSON object.' : hasTask1 ? 'After analyzing the provided Task 1 essay, you must return a single, valid JSON object. ONLY analyze Task 1 - Task 2 was skipped by the student.' : 'After analyzing the provided Task 2 essay, you must return a single, valid JSON object. ONLY analyze Task 2 - Task 1 was skipped by the student.'}

Score Each Criterion: ${hasTask1 && hasTask2 ? 'For both Task 1 and Task 2' : hasTask1 ? 'For Task 1 only' : 'For Task 2 only'}, provide a band score (from 0.0 to 9.0, in 0.5 increments) for each of the four criteria based on the descriptors above.

⚠️ CRITICAL BAND DESCRIPTOR ENFORCEMENT:
- BEFORE assigning any score, explicitly reference which band descriptor matches the writing
- Your score MUST directly correspond to the band descriptors you just read
- Example: "This is Band 6 because [reference to Band 6 descriptor], not Band 7 because [missing Band 7 requirement]"
- If writing shows Band 5 characteristics (limited X, basic Y), score Band 5 - do not inflate to Band 6
- If you cannot clearly match the writing to a descriptor, score LOWER, not higher
- Every score must have explicit band descriptor reference in the justification

Write Justifications: For each score, you must write a 3-4 sentence justification that:
1. Names which band descriptor your score matches (e.g., "This is Band 6 - The response focuses on requirements")
2. Quotes specific examples from student writing showing why this band applies
3. Explains what's missing for the next band level (what prevents Band 7)
CRITICAL: Do NOT use placeholder text. You MUST provide actual specific band descriptor references with real examples.

Handle Word Count: You must check if the essays are under the word count (150 for Task 1, 250 for Task 2). If an essay is significantly under length, you must state that this will lower the Task Achievement/Response score and reflect this in your scoring.

Provide Overall Feedback: Based on your analysis, provide a bulleted list of 2-3 "Key Strengths" and 2-3 "Specific, Actionable Improvements."

CRITICAL: Identify and Detail Multiple Areas for Improvement

After you have completed the band score assessment, you must generate comprehensive feedback for each task.

For ${hasTask1 && hasTask2 ? 'EACH task (Task 1 and Task 2)' : hasTask1 ? 'Task 1' : 'Task 2'}, you must analyze the submission and identify at least 3 to 5 distinct areas for improvement. Each area of improvement you identify must create a separate object in the improvements array.

Each object in the improvements array MUST contain the following four keys:
- issue: A short title for the problem area (e.g., "Repetitive Vocabulary," "Simple Sentence Structure," "Unsupported Idea").
- original: The exact quote from the student's writing that demonstrates this issue.
- improved: Your rewritten, high-scoring version of that specific sentence or phrase, making sure to preserve the student's original idea.
- explanation: A clear, concise explanation of why your improved version is better.

Requirements for improvements:
- Minimum 3 improvements per task
- Maximum 5 improvements per task (to avoid overwhelming students)
- Each improvement should address different aspects of writing (grammar, vocabulary, coherence, task response)
- Focus on the most impactful changes that would raise the band score
- Always preserve the student's original ideas and arguments

CRITICAL: Generate Sentence-by-Sentence Comparisons

For ${hasTask1 && hasTask2 ? 'EACH task (Task 1 and Task 2)' : hasTask1 ? 'Task 1' : 'Task 2'}, you MUST also generate sentence_comparisons. This is an array where each element represents ONE sentence from the student's writing.

For EACH sentence in the student's text, create one object in sentence_comparisons with:
- original_spans: An array of spans covering the ENTIRE original sentence (no gaps). Mark only truly problematic words/phrases as status: "error"; everything else is status: "neutral".
- corrected_spans: An array of spans covering the ENTIRE improved sentence (no gaps). Mark only new or improved words/phrases as status: "improvement"; everything else is status: "neutral".
- Do NOT highlight whole sentences unless the entire sentence is changed. Highlight only specific changed words/phrases.
- IMPORTANT: Ensure there is at least ONE improvement span per sentence unless the sentence is already perfect (in which case keep it identical with all neutral spans).

Example sentence_comparisons format:
{
  "sentence_comparisons": [
    {
      "original_spans": [
        { "text": "In 2000, China ", "status": "neutral" },
        { "text": "had the larger", "status": "error" },
        { "text": " population, at approximately 1.25 billion.", "status": "neutral" }
      ],
      "corrected_spans": [
        { "text": "In the year 2000, China ", "status": "neutral" },
        { "text": "possessed a significantly greater", "status": "improvement" },
        { "text": " population, standing at approximately 1.25 billion.", "status": "neutral" }
      ]
    }
  ]
}

You MUST analyze EVERY sentence in the student's text. For each sentence, output EXACTLY one object in sentence_comparisons.

CRITICAL: The sentence_comparisons array is MANDATORY and must be included in your JSON response. Do NOT omit it. If you fail to include sentence_comparisons, your response will be considered incomplete.

${hasTask1 ? `Task 1:
${trainingType === 'General' ? `LETTER WRITING (General Training)
Letter Prompt: ${task1Data?.title || 'Task 1'}
Letter Type: ${task1Data?.letterType || 'Formal'}
Instructions: ${task1Data?.instructions || ''}
Word Count: ${task1Answer.trim().split(/\s+/).length}
Student Letter: "${task1Answer}"

**CRITICAL:** Evaluate this as a LETTER. Task Achievement must consider: (1) whether all requirements are addressed, (2) whether the tone and register are appropriate for the situation and relationship, and (3) whether the letter format is appropriate (salutation, closing, paragraphing).` : `DATA DESCRIPTION (Academic)
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Visual Data: ${task1Data.imageContext}` : ''}
Word Count: ${task1Answer.trim().split(/\s+/).length}
Student Response: "${task1Answer}"`}
` : ''}

${hasTask2 ? `Task 2:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}
Student Response: "${task2Answer}"
` : ''}

JSON SCHEMA:
{
${hasTask1 ? `  "task1": {
    "criteria": {
      "task_achievement": { 
        "band": 6.5, 
        "justification": "The response covers the main requirements of the task. For example, the student mentions key trends such as 'sales increased from 2010 to 2020' and provides relevant data points. However, some details could be more fully developed, and the overview could be clearer." 
      },
      "coherence_and_cohesion": { 
        "band": 6.5, 
        "justification": "Information is generally arranged coherently with a clear overall progression. The student uses basic cohesive devices like 'however' and 'in addition', but there are some mechanical transitions. Paragraphing is logical but could be improved." 
      },
      "lexical_resource": { 
        "band": 6.5, 
        "justification": "The vocabulary is generally adequate for the task. The student uses appropriate words like 'significant' and 'trend', but there is some repetition (e.g., 'increase' appears multiple times). Word choice is clear but lacks sophistication." 
      },
      "grammatical_range_and_accuracy": { 
        "band": 6.5, 
        "justification": "A mix of simple and complex sentence forms is used, such as 'While sales increased, profits remained stable.' However, some grammatical errors occur, like 'the data show' (should be 'shows'), which occasionally impede communication." 
      }
    },
    "feedback": {
      "improvements": [
        {
          "issue": "Word Choice & Sophistication",
          "original": "The graph shows a big increase in sales.",
          "improved": "The provided chart illustrates a substantial growth in sales revenue.",
          "explanation": "Using more academic words like 'illustrates' and 'substantial growth' instead of simple words like 'shows' and 'big' makes your writing more sophisticated (improves Lexical Resource)."
        },
        {
          "issue": "Data Description Precision",
          "original": "The numbers went up a lot.",
          "improved": "The figures demonstrated a significant upward trend, rising from X to Y over the period shown.",
          "explanation": "Specific data references and precise vocabulary like 'demonstrated' and 'upward trend' improve Task Achievement by providing accurate data interpretation."
        },
        {
          "issue": "Sentence Structure Variety",
          "original": "Sales increased. Profits also increased.",
          "improved": "Not only did sales increase substantially, but profits also rose correspondingly.",
          "explanation": "Combining simple sentences with complex structures using phrases like 'Not only...but also' demonstrates better Grammatical Range and improves flow (Coherence)."
        }
      ],
      "feedback_markdown": "## Task 1 Detailed Feedback\n\n**Strengths:** List specific Task 1 strengths here.\n\n**Areas for Improvement:** Provide detailed Task 1 feedback here with specific examples."
    },
    "sentence_comparisons": [
      {
        "original_spans": [
          { "text": "Sample sentence with ", "status": "neutral" },
          { "text": "error", "status": "error" },
          { "text": " highlighted.", "status": "neutral" }
        ],
        "corrected_spans": [
          { "text": "Sample sentence with ", "status": "neutral" },
          { "text": "improvement", "status": "improvement" },
          { "text": " highlighted.", "status": "neutral" }
        ]
      }
    ],
    "original_spans": [
      { "text": "Full text with ", "status": "neutral" },
      { "text": "errors", "status": "error" },
      { "text": " marked.", "status": "neutral" }
    ],
    "corrected_spans": [
      { "text": "Full text with ", "status": "neutral" },
      { "text": "improvements", "status": "improvement" },
      { "text": " marked.", "status": "neutral" }
    ],
    "overall_band": 6.5,
    "word_count": ${task1Answer.trim().split(/\s+/).length}
  }${hasTask2 ? ',' : ''}` : ''}
${hasTask2 ? `  "task2": {
    "criteria": {
      "task_response": { 
        "band": 6.5, 
        "justification": "The main parts of the prompt are addressed with a clear position. For instance, the student states 'I believe that technology has both advantages and disadvantages' and provides relevant examples. However, some ideas could be more fully developed, and the conclusion could be stronger." 
      },
      "coherence_and_cohesion": { 
        "band": 6.5, 
        "justification": "Information is generally arranged coherently with a clear overall progression. The student uses cohesive devices like 'firstly', 'secondly', and 'in conclusion', but some transitions are mechanical. Paragraphing is logical and supports the overall structure." 
      },
      "lexical_resource": { 
        "band": 6.5, 
        "justification": "The vocabulary is generally adequate and appropriate. The student uses words like 'beneficial' and 'detrimental', but there is some repetition and limited use of less common vocabulary. Word choice is clear but could be more varied." 
      },
      "grammatical_range_and_accuracy": { 
        "band": 6.5, 
        "justification": "A mix of simple and complex sentence forms is used, such as 'Although technology brings benefits, it also creates challenges.' However, some grammatical errors occur, like subject-verb agreement issues, which occasionally affect clarity." 
      }
    },
    "feedback": {
      "improvements": [
        {
          "issue": "Sentence Structure & Flow",
          "original": "The company was successful. It made a lot of profit.",
          "improved": "As a result of its successful strategy, the company generated significant profits.",
          "explanation": "Combining two simple sentences into one complex sentence using a phrase like 'As a result of...' demonstrates better grammatical range and improves the flow (Coherence). The core idea that success led to profit is preserved."
        },
        {
          "issue": "Idea Development",
          "original": "Pollution is a major problem for cities.",
          "improved": "Urban pollution, particularly from vehicle emissions, has become a critical issue affecting public health in major metropolitan areas.",
          "explanation": "This improvement keeps your original idea but makes it stronger by adding specific details ('from vehicle emissions', 'affecting public health'). This demonstrates better development of ideas (improves Task Response)."
        },
        {
          "issue": "Argumentative Structure",
          "original": "I think this is good because people like it.",
          "improved": "This approach proves beneficial as it addresses the fundamental needs of the target population.",
          "explanation": "Replacing informal language ('I think', 'people like it') with formal academic expressions ('proves beneficial', 'fundamental needs') strengthens your argument and improves Lexical Resource."
        },
        {
          "issue": "Cohesive Devices",
          "original": "First, education is important. Second, health is important too.",
          "improved": "While education remains paramount, healthcare infrastructure is equally crucial for societal development.",
          "explanation": "Using sophisticated linking phrases like 'While...remains paramount' and 'equally crucial' creates better flow between ideas and demonstrates advanced Coherence and Cohesion."
        }
      ],
      "feedback_markdown": "## Task 2 Detailed Feedback\n\n**Strengths:** List specific Task 2 strengths here.\n\n**Areas for Improvement:** Provide detailed Task 2 feedback here with specific examples."
    },
    "sentence_comparisons": [
      {
        "original_spans": [
          { "text": "Sample sentence with ", "status": "neutral" },
          { "text": "error", "status": "error" },
          { "text": " highlighted.", "status": "neutral" }
        ],
        "corrected_spans": [
          { "text": "Sample sentence with ", "status": "neutral" },
          { "text": "improvement", "status": "improvement" },
          { "text": " highlighted.", "status": "neutral" }
        ]
      }
    ],
    "original_spans": [
      { "text": "Full text with ", "status": "neutral" },
      { "text": "errors", "status": "error" },
      { "text": " marked.", "status": "neutral" }
    ],
    "corrected_spans": [
      { "text": "Full text with ", "status": "neutral" },
      { "text": "improvements", "status": "improvement" },
      { "text": " marked.", "status": "neutral" }
    ],
    "overall_band": 6.5,
    "word_count": ${task2Answer.trim().split(/\s+/).length}
  }` : ''}
  "overall": {
    "band": 6.5,
    "calculation": "Calculation explanation"
  },
  "key_strengths": [
    "List 2-3 specific strengths from both tasks"
  ]
}`;

    // Generate deterministic seed from student answers
    const seedContent = [
      task1Answer || '',
      task2Answer || '',
      task1Data?.title || '',
      task1Data?.instructions || '',
      task2Data?.title || '',
      task2Data?.instructions || '',
      targetLanguage || 'en'
    ].join('|');
    const seed = createSeed(seedContent);
    console.log(`🌱 Generated seed: ${seed} from content hash`);

    // Route to correct model based on model parameter
    let aiResponse: any;
    let modelUsed: string;
    let content: string;
    
    const selectedModel = model || 'gemini-2.5-flash';
    console.log(`🎯 Selected model: ${selectedModel}`);
    
    // Route to correct model function
    if (openRouterApiKey) {
      try {
        if (selectedModel === 'kimi-k2-thinking') {
          console.log('🔄 Using Kimi K2 Thinking (OpenRouter)...');
          console.log('🔑 OpenRouter API key present, length:', openRouterApiKey.length);
          console.log('🤖 Model: moonshotai/kimi-k2-thinking via OpenRouter');
          aiResponse = await callKimiK2Thinking(masterExaminerPrompt, openRouterApiKey, seed);
          modelUsed = 'Kimi K2 Thinking (OpenRouter)';
          content = aiResponse.choices?.[0]?.message?.content ?? '';
          console.log('✅ Kimi K2 Thinking (OpenRouter) succeeded');
          console.log(`📝 Response length: ${content.length} characters`);
        } else if (selectedModel === 'gpt-5.1' || selectedModel === 'chatgpt-5.1') {
          console.log('🔄 Using GPT-5.1 (OpenRouter)...');
          console.log('🔑 OpenRouter API key present, length:', openRouterApiKey.length);
          console.log('🤖 Model: openai/gpt-5.1 via OpenRouter');
          aiResponse = await callGPT51ViaOpenRouter(masterExaminerPrompt, openRouterApiKey, seed);
          modelUsed = 'GPT-5.1 (OpenRouter)';
          content = aiResponse.choices?.[0]?.message?.content ?? '';
          console.log('✅ GPT-5.1 (OpenRouter) succeeded');
          console.log(`📝 Response length: ${content.length} characters`);
        } else {
          // Default: Gemini 2.5 Flash
          console.log('🔄 Using Gemini 2.5 Flash (OpenRouter) as default model...');
          console.log('🔑 OpenRouter API key present, length:', openRouterApiKey.length);
          console.log('🤖 Model: google/gemini-2.5-flash via OpenRouter');
          aiResponse = await callGeminiViaOpenRouter(masterExaminerPrompt, openRouterApiKey, seed);
          modelUsed = 'Gemini 2.5 Flash (OpenRouter)';
          content = aiResponse.choices?.[0]?.message?.content ?? '';
          console.log('✅ Gemini 2.5 Flash (OpenRouter) succeeded');
          console.log(`📝 Response length: ${content.length} characters`);
        }
      } catch (modelError) {
        console.error(`❌ ${selectedModel} (OpenRouter) failed with error:`, (modelError as any).message);
        console.error('❌ Error details:', modelError);
        console.log(`⚠️ ${selectedModel} (OpenRouter) failed, falling back to secondary models`);
        
        // Fallback 1: Use requested provider or Gemini
        if (apiProvider === 'openai' && openaiApiKey) {
          try {
            console.log('🔄 Fallback 1: Using OpenAI API...');
            aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey, seed);
            // @ts-expect-error - Deno global is available at runtime
            modelUsed = `OpenAI ${Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'} (Fallback)`;
            content = aiResponse.choices?.[0]?.message?.content ?? '';
            console.log('✅ OpenAI fallback succeeded');
          } catch (openaiError) {
            console.log('⚠️ OpenAI fallback failed, trying Gemini:', (openaiError as any).message);
            throw openaiError; // Will trigger Gemini fallback
          }
        } else if (geminiApiKey) {
          try {
            console.log('🔄 Fallback 1: Using Gemini API...');
            aiResponse = await callGemini(masterExaminerPrompt, geminiApiKey, seed);
            modelUsed = 'Google Gemini AI (Fallback)';
            content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            console.log('✅ Gemini fallback succeeded');
          } catch (geminiError) {
            console.log('⚠️ Gemini fallback failed, trying DeepSeek:', (geminiError as any).message);
            // Final fallback: DeepSeek
            // @ts-expect-error - Deno global is available at runtime
            // @ts-expect-error - Deno global is available at runtime
          const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
            if (deepseekKey) {
              console.log('🔄 Final Fallback: Using DeepSeek API...');
              aiResponse = await callDeepSeek(masterExaminerPrompt, deepseekKey, seed);
              // @ts-expect-error - Deno global is available at runtime
              modelUsed = `DeepSeek ${(Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-reasoner')} (Final Fallback)`;
              content = aiResponse.choices?.[0]?.message?.content ?? '';
              console.log('✅ DeepSeek final fallback succeeded');
            } else {
              throw new Error('All models failed and no DEEPSEEK_API_KEY available for final fallback');
            }
          }
        } else {
          throw new Error(`${selectedModel} (OpenRouter) failed and no fallback API keys available`);
        }
      }
    } else {
      // No OpenRouter key, use legacy flow
      if (apiProvider === 'openai') {
        console.log('🔄 Using OpenAI API (no OpenRouter key)...');
        aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey, seed);
        // @ts-expect-error - Deno global is available at runtime
        modelUsed = `OpenAI ${Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'}`;
        content = aiResponse.choices?.[0]?.message?.content ?? '';
        console.log('✅ OpenAI API succeeded');
      } else {
        try {
          console.log('🔄 Using Gemini API (no OpenRouter key)...');
          aiResponse = await callGemini(masterExaminerPrompt, geminiApiKey, seed);
          modelUsed = 'Google Gemini AI';
          content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          console.log('✅ Gemini API succeeded');
        } catch (geminiError) {
          console.log('⚠️ Gemini failed, falling back to DeepSeek:', (geminiError as any).message);
          // @ts-expect-error - Deno global is available at runtime
          // @ts-expect-error - Deno global is available at runtime
          // @ts-expect-error - Deno global is available at runtime
          const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
          if (!deepseekKey) {
            throw new Error('Gemini failed and no DEEPSEEK_API_KEY available for fallback');
          }
          console.log('🔄 Fallback: Using DeepSeek API...');
          aiResponse = await callDeepSeek(masterExaminerPrompt, deepseekKey, seed);
          // @ts-expect-error - Deno global is available at runtime
          modelUsed = `DeepSeek ${(Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-reasoner')} (Fallback)`;
          content = aiResponse.choices?.[0]?.message?.content ?? '';
          console.log('✅ DeepSeek fallback succeeded');
        }
      }
    }

    console.log('🔍 Raw API response content length:', content.length);
    
    if (!content || content.length < 10) {
      console.error('❌ API response content is empty or too short:', content);
      throw new Error('API returned empty or invalid response');
    }
    
    // Optimized logging: only log in development or truncate
    // @ts-expect-error - Deno global is available at runtime
    const isDevelopment = Deno.env.get('ENV') === 'development' || Deno.env.get('DENO_ENV') === 'development';
    if (isDevelopment) {
      console.log('🔍 Raw API response first 500 chars:', content.substring(0, 500));
      console.log('🔍 Raw API response last 500 chars:', content.substring(content.length - 500));
    } else {
      // Production: only log truncated version
      console.log('🔍 Raw API response preview:', content.substring(0, 100) + '...');
    }

    let structured: any = null;
    try {
      structured = JSON.parse(content);
      console.log('✅ Successfully parsed structured response');
    } catch (_e) {
      console.log('⚠️ Failed to parse JSON directly, attempting extraction...');
      
      // Optimized JSON parsing: max 2 attempts
      let extractedJson = '';
      let cleaned = content.trim();
      
      // Remove markdown code blocks
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      
      cleaned = cleaned.trim();
      
      // Find the main JSON object
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        extractedJson = cleaned.substring(firstBrace, lastBrace + 1);
        
        // @ts-expect-error - Deno global is available at runtime
        const isDevelopment = Deno.env.get('ENV') === 'development' || Deno.env.get('DENO_ENV') === 'development';
        if (isDevelopment) {
          console.log('🔍 Extracted JSON length:', extractedJson.length);
          console.log('🔍 Extracted JSON preview:', extractedJson.substring(0, 200) + '...');
        }
        
        try {
          structured = JSON.parse(extractedJson);
          console.log('✅ Successfully parsed extracted JSON');
        } catch (parseError) {
          console.log('❌ Failed to parse extracted JSON, attempting fix...');
          
          // Single fix attempt: remove trailing commas and balance braces
          try {
            let fixedJson = extractedJson.replace(/,(\s*[}\]])/g, '$1');
            
            // Balance braces if needed
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            
            if (openBraces > closeBraces) {
              fixedJson += '}'.repeat(openBraces - closeBraces);
            }
            
            structured = JSON.parse(fixedJson);
            console.log('✅ Successfully parsed fixed JSON');
          } catch (fixError) {
            console.log('❌ Final parsing attempt failed:', fixError.message);
            // Will fall through to fallback structure
          }
        }
      }
    }

    // AI handles all scoring and word count considerations internally

    // If parsing failed entirely, build a minimal, safe fallback so the UI never breaks
    if (!structured) {
      console.warn('⚠️ No structured JSON parsed; building minimal fallback structure');
      structured = {
        ...(hasTask1 ? {
          task1: {
            criteria: {},
            feedback: {
              improvements: [],
              feedback_markdown: '### Task 1 Assessment\n\nThe AI response could not be parsed into structured JSON.\n\nRaw summary (truncated):\n' + (content || '').slice(0, 800)
            },
            word_count: task1Answer ? task1Answer.trim().split(/\s+/).length : 0
          }
        } : {}),
        ...(hasTask2 ? {
          task2: {
            criteria: {},
            feedback: {
              improvements: [],
              feedback_markdown: '### Task 2 Assessment\n\nThe AI response could not be parsed into structured JSON.\n\nRaw summary (truncated):\n' + (content || '').slice(0, 800)
            },
            word_count: task2Answer ? task2Answer.trim().split(/\s+/).length : 0
          }
        } : {}),
        overall: {
          band: 6.0,
          calculation: 'Fallback default because structured JSON was unavailable.'
        }
      };
    }

    // Helper: round to IELTS 0.5 steps and clamp 0..9
    const roundIELTS = (n: number) => Math.min(9, Math.max(0, Math.round(n * 2) / 2));

    // Validate and add fallback data for frontend compatibility
    if (structured) {
      // Improved: Only auto-fill if 1-2 criteria missing, not all 4
      const ensureCriteria = (task: any, type: 'task1' | 'task2') => {
        const overall = typeof task?.overall_band === 'number' ? task.overall_band : (typeof structured?.overall?.band === 'number' ? structured.overall.band : 6.5);
        task.criteria = task.criteria || {};
        
        // Count how many criteria are missing
        const criteriaNames = type === 'task1' 
          ? ['task_achievement', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy']
          : ['task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy'];
        
        const missingCount = criteriaNames.filter(name => !task.criteria[name] || typeof task.criteria[name]?.band !== 'number').length;
        
        // IMPROVED: Never auto-fill - require complete scoring
        if (missingCount > 0) {
          console.warn(`⚠️ Incomplete scoring for ${type}: ${missingCount} out of 4 criteria missing`);
          task.analysis_incomplete = true;
          task.incomplete_reason = `${missingCount} criteria not provided - AI must score all 4 criteria`;
        }
        
        // Fill missing criteria with 0 (not auto-filled to overall)
        // This preserves incomplete status and forces accurate scoring
        const criteriaList = type === 'task1' 
          ? ['task_achievement', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy']
          : ['task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy'];
        
        for (const criterion of criteriaList) {
          if (!task.criteria[criterion] || typeof task.criteria[criterion]?.band !== 'number') {
            task.criteria[criterion] = { 
              band: 0, 
              justification: 'Not provided by AI analysis - criterion scoring incomplete' 
            };
          }
        }
      };

      ensureCriteria(structured.task1 || (structured.task1 = {}), 'task1');
      ensureCriteria(structured.task2 || (structured.task2 = {}), 'task2');

      const isValidBand = (n: any) => typeof n === 'number' && n >= 0 && n <= 9 && (n * 2) % 1 === 0;
      const getTaskBands = (task: any, type: 'task1' | 'task2') => {
        const c = task?.criteria || {};
        const b1 = type === 'task1' ? c?.task_achievement?.band : c?.task_response?.band;
        const b2 = c?.coherence_and_cohesion?.band;
        const b3 = c?.lexical_resource?.band;
        const b4 = c?.grammatical_range_and_accuracy?.band;
        return [b1, b2, b3, b4];
      };

      // Validate score-justification consistency
      const validateScoreConsistency = (criteria: any, criterionName: string): boolean => {
        if (!criteria?.band || !criteria?.justification) return false;
        
        const band = criteria.band;
        const justification = criteria.justification.toLowerCase();
        
        // Check if justification mentions a band level that matches the score
        const bandMentions = [
          { level: 9, keywords: ['band 9', 'excellent', 'outstanding', 'perfect', 'flawless'] },
          { level: 8, keywords: ['band 8', 'very good', 'strong', 'well-developed'] },
          { level: 7, keywords: ['band 7', 'good', 'adequate', 'sufficient'] },
          { level: 6, keywords: ['band 6', 'competent', 'adequate', 'satisfactory'] },
          { level: 5, keywords: ['band 5', 'limited', 'basic', 'modest'] },
          { level: 4, keywords: ['band 4', 'minimal', 'very limited', 'poor'] },
        ];
        
        // Check if justification mentions band level close to actual score
        const mentionedLevel = bandMentions.find(m => 
          m.keywords.some(kw => justification.includes(kw))
        );
        
        if (mentionedLevel) {
          const levelDiff = Math.abs(mentionedLevel.level - band);
          // STRICTER: Only allow 0.5 band difference (not 1.0)
          // This prevents contradictions like "Band 6.5 score" with "Band 7+ justification"
          if (levelDiff > 0.5) {
            console.warn(`⚠️ STRICT Score-justification mismatch for ${criterionName}: score=${band}, justification mentions ~${mentionedLevel.level} (diff=${levelDiff})`);
            return false;
          }
        }
        
        return true;
      };

      const bandsMissingOrAutoFilled = (task: any, type: 'task1' | 'task2', overall: number) => {
        const c = task?.criteria || {};
        const justs = [
          type === 'task1' ? c?.task_achievement?.justification : c?.task_response?.justification,
          c?.coherence_and_cohesion?.justification,
          c?.lexical_resource?.justification,
          c?.grammatical_range_and_accuracy?.justification,
        ];
        const bands = getTaskBands(task, type);
        const incomplete = bands.some((b) => typeof b !== 'number');
        const autoFilled = justs.every((j) => typeof j === 'string' && j.includes('Auto-filled'));
        
        // Improved: Only flag all-equal if justifications are also generic/identical
        const allEqualOverall = bands.every((b) => typeof b === 'number' && b === overall);
        const justificationsGeneric = justs.every((j) => 
          typeof j === 'string' && (
            j.includes('Auto-filled') || 
            j.length < 50 || // Very short justifications
            justs.filter(j2 => j2 === j).length > 1 // Identical justifications
          )
        );
        
        // Only trigger rescore if scores equal AND justifications are generic
        const suspiciousAllEqual = allEqualOverall && justificationsGeneric;
        
        return incomplete || autoFilled || suspiciousAllEqual;
      };

      const maybeRescore = async () => {
        const overall = typeof structured?.overall?.band === 'number' ? structured.overall.band : 6.5;
        const needsTask1 = hasTask1 && structured?.task1 ? bandsMissingOrAutoFilled(structured.task1, 'task1', overall) : false;
        const needsTask2 = hasTask2 && structured?.task2 ? bandsMissingOrAutoFilled(structured.task2, 'task2', overall) : false;
        
        // Early return - skip async call if not needed
        if (!needsTask1 && !needsTask2) {
          console.log('✅ All scores valid, skipping rescore');
          return;
        }

        console.log(`🔄 Rescoring needed: Task1=${needsTask1}, Task2=${needsTask2}`);

        // Improved rescore prompt with full context
        const scoringPrompt = `You are an expert IELTS examiner. Return ONLY valid JSON with numeric band scores (0.0-9.0 in 0.5 increments).

JSON Schema:
{
${hasTask1 ? `  "task1": {
    "task_achievement": 0.0,
    "coherence_and_cohesion": 0.0,
    "lexical_resource": 0.0,
    "grammatical_range_and_accuracy": 0.0
  }${hasTask2 ? ',' : ''}` : ''}
${hasTask2 ? `  "task2": {
    "task_response": 0.0,
    "coherence_and_cohesion": 0.0,
    "lexical_resource": 0.0,
    "grammatical_range_and_accuracy": 0.0
  }` : ''}
}

${hasTask1 ? `Task 1:
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
Student Response: "${task1Answer}"
Word Count: ${task1Answer.trim().split(/\s+/).length}
` : ''}
${hasTask2 ? `Task 2:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}
Student Response: "${task2Answer}"
Word Count: ${task2Answer.trim().split(/\s+/).length}
` : ''}
Use official IELTS band descriptors. Be strict and accurate. Return ONLY the JSON object, no additional text. ${hasTask1 && !hasTask2 ? 'ONLY analyze Task 1 - Task 2 was skipped.' : !hasTask1 && hasTask2 ? 'ONLY analyze Task 2 - Task 1 was skipped.' : ''}`;

        // Parallel rescoring - try all providers simultaneously
        const tryRescoreParallel = async (): Promise<any | null> => {
          const promises: Promise<any>[] = [];
          
          if (geminiApiKey) {
            promises.push(
              callGemini(scoringPrompt, geminiApiKey, seed)
                .then(resp => {
                  const scoreText = resp.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                  return JSON.parse((scoreText.match(/\{[\s\S]*\}/) || [scoreText])[0]);
                })
                .catch(e => {
                  console.log('⚠️ Rescore via Gemini failed:', (e as any)?.message);
                  throw e;
                })
            );
          }
          
          // @ts-expect-error - Deno global is available at runtime
          const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
          if (deepseekKey) {
            promises.push(
              callDeepSeek(scoringPrompt, deepseekKey, seed)
                .then(resp => {
                  const text = resp.choices?.[0]?.message?.content ?? '';
                  return JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]);
                })
                .catch(e => {
                  console.log('⚠️ Rescore via DeepSeek failed:', (e as any)?.message);
                  throw e;
                })
            );
          }
          
          if (openaiApiKey) {
            promises.push(
              callOpenAI(`You must return ONLY JSON in the schema above. ${scoringPrompt}`, openaiApiKey, seed)
                .then(resp => {
                  const text = resp.choices?.[0]?.message?.content ?? '';
                  return JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]);
                })
                .catch(e => {
                  console.log('⚠️ Rescore via OpenAI failed:', (e as any)?.message);
                  throw e;
                })
            );
          }
          
          if (promises.length === 0) {
            return null;
          }
          
          // Use Promise.allSettled to get first successful result
          const results = await Promise.allSettled(promises);
          
          for (const result of results) {
            if (result.status === 'fulfilled') {
              console.log('✅ Rescore succeeded via parallel call');
              return result.value;
            }
          }
          
          console.log('❌ All rescore attempts failed');
          return null;
        };

        const parsed = await tryRescoreParallel();
        if (parsed) {
          if (needsTask1 && hasTask1 && parsed?.task1 && structured?.task1) {
            structured.task1.criteria.task_achievement.band = parsed.task1.task_achievement ?? structured.task1.criteria.task_achievement.band;
            structured.task1.criteria.coherence_and_cohesion.band = parsed.task1.coherence_and_cohesion ?? structured.task1.criteria.coherence_and_cohesion.band;
            structured.task1.criteria.lexical_resource.band = parsed.task1.lexical_resource ?? structured.task1.criteria.lexical_resource.band;
            structured.task1.criteria.grammatical_range_and_accuracy.band = parsed.task1.grammatical_range_and_accuracy ?? structured.task1.criteria.grammatical_range_and_accuracy.band;
            structured.task1.criteria.task_achievement.justification = structured.task1.criteria.task_achievement.justification || 'Rescored numerically.';
            structured.task1.criteria.coherence_and_cohesion.justification = structured.task1.criteria.coherence_and_cohesion.justification || 'Rescored numerically.';
            structured.task1.criteria.lexical_resource.justification = structured.task1.criteria.lexical_resource.justification || 'Rescored numerically.';
            structured.task1.criteria.grammatical_range_and_accuracy.justification = structured.task1.criteria.grammatical_range_and_accuracy.justification || 'Rescored numerically.';
          }
          if (needsTask2 && hasTask2 && parsed?.task2 && structured?.task2) {
            structured.task2.criteria.task_response.band = parsed.task2.task_response ?? structured.task2.criteria.task_response.band;
            structured.task2.criteria.coherence_and_cohesion.band = parsed.task2.coherence_and_cohesion ?? structured.task2.criteria.coherence_and_cohesion.band;
            structured.task2.criteria.lexical_resource.band = parsed.task2.lexical_resource ?? structured.task2.criteria.lexical_resource.band;
            structured.task2.criteria.grammatical_range_and_accuracy.band = parsed.task2.grammatical_range_and_accuracy ?? structured.task2.criteria.grammatical_range_and_accuracy.band;
            structured.task2.criteria.task_response.justification = structured.task2.criteria.task_response.justification || 'Rescored numerically.';
            structured.task2.criteria.coherence_and_cohesion.justification = structured.task2.criteria.coherence_and_cohesion.justification || 'Rescored numerically.';
            structured.task2.criteria.lexical_resource.justification = structured.task2.criteria.lexical_resource.justification || 'Rescored numerically.';
            structured.task2.criteria.grammatical_range_and_accuracy.justification = structured.task2.criteria.grammatical_range_and_accuracy.justification || 'Rescored numerically.';
          }

          // Recalculate per-task and overall if not provided
          const t1 = structured.task1 ? getTaskBands(structured.task1, 'task1').filter((b) => typeof b === 'number') as number[] : [];
          const t2 = structured.task2 ? getTaskBands(structured.task2, 'task2').filter((b) => typeof b === 'number') as number[] : [];
          if (t1.length === 4) {
            structured.task1.overall_band = roundIELTS((t1[0] + t1[1] + t1[2] + t1[3]) / 4);
          }
          if (t2.length === 4) {
            structured.task2.overall_band = roundIELTS((t2[0] + t2[1] + t2[2] + t2[3]) / 4);
          }
          
          // Calculate overall band only from non-skipped tasks
          const hasTask1Band = typeof structured.task1?.overall_band === 'number';
          const hasTask2Band = typeof structured.task2?.overall_band === 'number';
          
          if (hasTask1Band && hasTask2Band) {
            // Both tasks completed - use standard IELTS weighting (Task 1 = 1/3, Task 2 = 2/3)
            const overallWeighted = roundIELTS((structured.task1.overall_band + 2 * structured.task2.overall_band) / 3);
            structured.overall = structured.overall || {};
            structured.overall.band = overallWeighted;
            structured.overall.calculation = 'Weighted average (Task 1 x1, Task 2 x2)';
          } else if (hasTask1Band) {
            // Only Task 1 completed
            structured.overall = structured.overall || {};
            structured.overall.band = structured.task1.overall_band;
            structured.overall.calculation = 'Task 1 only (Task 2 was skipped)';
          } else if (hasTask2Band) {
            // Only Task 2 completed
            structured.overall = structured.overall || {};
            structured.overall.band = structured.task2.overall_band;
            structured.overall.calculation = 'Task 2 only (Task 1 was skipped)';
          }
        }
      };

      // DISABLED: Rescoring causes inconsistency and adds 50% latency
      // await maybeRescore();
      console.log('✅ Skipping rescoring - trusting primary AI assessment');

      // Ensure task1 feedback structure exists
      if (!structured.task1?.feedback) {
        structured.task1 = structured.task1 || {};
        structured.task1.feedback = {
          improvements: [],
          feedback_markdown: "## Task 1 Feedback\n\nNo specific improvements available."
        };
      }
      
      // Ensure task2 feedback structure exists
      if (!structured.task2?.feedback) {
        structured.task2 = structured.task2 || {};
        structured.task2.feedback = {
          improvements: [],
          feedback_markdown: "## Task 2 Feedback\n\nNo specific improvements available."
        };
      }
      
      // Post-process sentence_comparisons: ensure they exist and are properly formatted
      const buildDiffSpans = (orig: string, imp: string) => {
        const o = orig.split(/\s+/);
        const p = imp.split(/\s+/);
        const n = o.length, m = p.length;
        const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
        for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = o[i] === p[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        const keepO = Array(n).fill(false), keepP = Array(m).fill(false);
        let i = 0, j = 0; while (i < n && j < m) { if (o[i] === p[j]) { keepO[i] = keepP[j] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
        const push = (arr: any[], text: string, status: string) => { const t = text.replace(/\s+/g,' ').trim(); if (t.length) arr.push({ text: t + ' ', status }); };
        const original_spans: any[] = []; const corrected_spans: any[] = [];
        let buf = '', cur = 'neutral';
        for (let t = 0; t < n; t++) { const ns = keepO[t] ? 'neutral' : 'error'; if (t === 0) cur = ns; if (ns !== cur) { push(original_spans, buf, cur); buf=''; cur=ns; } buf += (buf?' ':'') + o[t]; }
        push(original_spans, buf, cur);
        buf = ''; cur = 'neutral';
        for (let t = 0; t < m; t++) { const ns = keepP[t] ? 'neutral' : 'improvement'; if (t === 0) cur = ns; if (ns !== cur) { push(corrected_spans, buf, cur); buf=''; cur=ns; } buf += (buf?' ':'') + p[t]; }
        push(corrected_spans, buf, cur);
        return { original_spans, corrected_spans };
      };

      const spanHasImprovement = (spans: any[] | undefined) => Array.isArray(spans) && spans.some(s => s?.status === 'improvement');

      // Process sentence_comparisons for Task 1
      if (hasTask1 && structured?.task1) {
        const hasSentenceComparisons = Array.isArray(structured.task1.sentence_comparisons) && structured.task1.sentence_comparisons.length > 0;
        console.log(`🔍 Task 1 sentence_comparisons check: ${hasSentenceComparisons ? 'PRESENT' : 'MISSING'} (count: ${structured.task1.sentence_comparisons?.length || 0})`);
        
        if (!hasSentenceComparisons) {
          console.log('⚠️ Task 1 missing sentence_comparisons, generating from improvements...');
          // Generate sentence_comparisons from improvements if available
          const improvements = structured.task1.feedback?.improvements || [];
          if (improvements.length > 0) {
            structured.task1.sentence_comparisons = improvements.map((imp: any) => {
              const orig = imp.original || '';
              const impv = imp.improved || orig;
              const d = buildDiffSpans(orig, impv);
              return { original_spans: d.original_spans, corrected_spans: d.corrected_spans };
            });
          } else {
            // Fallback: create from full text
            const sentences = (task1Answer || '').split(/[.!?]+/).filter(s => s.trim().length > 0);
            structured.task1.sentence_comparisons = sentences.map((s: string) => {
              const d = buildDiffSpans(s.trim(), s.trim());
              return { original_spans: d.original_spans, corrected_spans: d.corrected_spans };
            });
          }
        } else {
          // Validate and repair existing sentence_comparisons
          structured.task1.sentence_comparisons = structured.task1.sentence_comparisons.map((s: any) => {
            const originalText = Array.isArray(s.original_spans) ? s.original_spans.map((x: any) => x?.text || '').join('').trim() : (s.original || '');
            const improvedText = Array.isArray(s.corrected_spans) ? s.corrected_spans.map((x: any) => x?.text || '').join('').trim() : (s.improved || '');
            const needRepair = !spanHasImprovement(s.corrected_spans) || !Array.isArray(s.original_spans) || !Array.isArray(s.corrected_spans);
            if (needRepair && originalText && improvedText) {
              const d = buildDiffSpans(originalText, improvedText);
              s.original_spans = d.original_spans;
              s.corrected_spans = d.corrected_spans;
            }
            return s;
          });
        }

        // Generate original_spans and corrected_spans for whole text view
        if (!structured.task1.original_spans || !structured.task1.corrected_spans) {
          const fullOriginal = task1Answer || '';
          const fullImproved = structured.task1.sentence_comparisons
            .map((sc: any) => (sc.corrected_spans || []).map((s: any) => s.text || '').join(''))
            .join(' ')
            .trim() || fullOriginal;
          const d = buildDiffSpans(fullOriginal, fullImproved);
          structured.task1.original_spans = d.original_spans;
          structured.task1.corrected_spans = d.corrected_spans;
        }
      }

      // Process sentence_comparisons for Task 2
      if (hasTask2 && structured?.task2) {
        const hasSentenceComparisons = Array.isArray(structured.task2.sentence_comparisons) && structured.task2.sentence_comparisons.length > 0;
        console.log(`🔍 Task 2 sentence_comparisons check: ${hasSentenceComparisons ? 'PRESENT' : 'MISSING'} (count: ${structured.task2.sentence_comparisons?.length || 0})`);
        
        if (!hasSentenceComparisons) {
          console.log('⚠️ Task 2 missing sentence_comparisons, generating from improvements...');
          // Generate sentence_comparisons from improvements if available
          const improvements = structured.task2.feedback?.improvements || [];
          if (improvements.length > 0) {
            structured.task2.sentence_comparisons = improvements.map((imp: any) => {
              const orig = imp.original || '';
              const impv = imp.improved || orig;
              const d = buildDiffSpans(orig, impv);
              return { original_spans: d.original_spans, corrected_spans: d.corrected_spans };
            });
          } else {
            // Fallback: create from full text
            const sentences = (task2Answer || '').split(/[.!?]+/).filter(s => s.trim().length > 0);
            structured.task2.sentence_comparisons = sentences.map((s: string) => {
              const d = buildDiffSpans(s.trim(), s.trim());
              return { original_spans: d.original_spans, corrected_spans: d.corrected_spans };
            });
          }
        } else {
          // Validate and repair existing sentence_comparisons
          structured.task2.sentence_comparisons = structured.task2.sentence_comparisons.map((s: any) => {
            const originalText = Array.isArray(s.original_spans) ? s.original_spans.map((x: any) => x?.text || '').join('').trim() : (s.original || '');
            const improvedText = Array.isArray(s.corrected_spans) ? s.corrected_spans.map((x: any) => x?.text || '').join('').trim() : (s.improved || '');
            const needRepair = !spanHasImprovement(s.corrected_spans) || !Array.isArray(s.original_spans) || !Array.isArray(s.corrected_spans);
            if (needRepair && originalText && improvedText) {
              const d = buildDiffSpans(originalText, improvedText);
              s.original_spans = d.original_spans;
              s.corrected_spans = d.corrected_spans;
            }
            return s;
          });
        }

        // Generate original_spans and corrected_spans for whole text view
        if (!structured.task2.original_spans || !structured.task2.corrected_spans) {
          const fullOriginal = task2Answer || '';
          const fullImproved = structured.task2.sentence_comparisons
            .map((sc: any) => (sc.corrected_spans || []).map((s: any) => s.text || '').join(''))
            .join(' ')
            .trim() || fullOriginal;
          const d = buildDiffSpans(fullOriginal, fullImproved);
          structured.task2.original_spans = d.original_spans;
          structured.task2.corrected_spans = d.corrected_spans;
        }
      }

      // Validate improvements array quality
      const validateImprovements = (improvements: any[], taskName: string) => {
        if (!Array.isArray(improvements)) return [];
        
        return improvements.filter((imp, idx) => {
          // Check required fields
          if (!imp.issue || !imp.original || !imp.improved || !imp.explanation) {
            console.warn(`⚠️ Improvement ${idx} in ${taskName} missing required fields, filtering out`);
            return false;
          }
          
          // Check if improved is actually different from original
          if (imp.original.trim().toLowerCase() === imp.improved.trim().toLowerCase()) {
            console.warn(`⚠️ Improvement ${idx} in ${taskName} has identical original/improved text, filtering out`);
            return false;
          }
          
          // Check if fields are not empty
          if (!imp.issue.trim() || !imp.original.trim() || !imp.improved.trim() || !imp.explanation.trim()) {
            console.warn(`⚠️ Improvement ${idx} in ${taskName} has empty fields, filtering out`);
            return false;
          }
          
          return true;
        });
      };
      
      // Validate and clean improvements
      if (structured.task1?.feedback?.improvements) {
        structured.task1.feedback.improvements = validateImprovements(
          structured.task1.feedback.improvements,
          'task1'
        );
      }
      
      if (structured.task2?.feedback?.improvements) {
        structured.task2.feedback.improvements = validateImprovements(
          structured.task2.feedback.improvements,
          'task2'
        );
      }
      
      // Validate score-justification consistency for all criteria
      if (structured.task1?.criteria) {
        const t1Valid = validateScoreConsistency(structured.task1.criteria.task_achievement, 'task1.task_achievement');
        const t1ccValid = validateScoreConsistency(structured.task1.criteria.coherence_and_cohesion, 'task1.coherence_and_cohesion');
        const t1lrValid = validateScoreConsistency(structured.task1.criteria.lexical_resource, 'task1.lexical_resource');
        const t1grValid = validateScoreConsistency(structured.task1.criteria.grammatical_range_and_accuracy, 'task1.grammatical_range_and_accuracy');
        
        if (!t1Valid || !t1ccValid || !t1lrValid || !t1grValid) {
          console.warn('⚠️ Some Task 1 score-justification mismatches detected');
        }
      }
      
      if (structured.task2?.criteria) {
        const t2Valid = validateScoreConsistency(structured.task2.criteria.task_response, 'task2.task_response');
        const t2ccValid = validateScoreConsistency(structured.task2.criteria.coherence_and_cohesion, 'task2.coherence_and_cohesion');
        const t2lrValid = validateScoreConsistency(structured.task2.criteria.lexical_resource, 'task2.lexical_resource');
        const t2grValid = validateScoreConsistency(structured.task2.criteria.grammatical_range_and_accuracy, 'task2.grammatical_range_and_accuracy');
        
        if (!t2Valid || !t2ccValid || !t2lrValid || !t2grValid) {
          console.warn('⚠️ Some Task 2 score-justification mismatches detected');
        }
      }
      
      // Migrate legacy specific_improvements to task-specific feedback if needed
      if (structured.specific_improvements && Array.isArray(structured.specific_improvements)) {
        console.log('🔄 Migrating legacy specific_improvements to task-specific format...');
        
        // Split improvements between tasks based on content analysis
        const task1Improvements: any[] = [];
        const task2Improvements: any[] = [];
        
        structured.specific_improvements.forEach((improvement: any) => {
          // Simple heuristic: if original text appears in task1Answer, assign to task1, otherwise task2
          if (hasTask1 && task1Answer && task1Answer.includes(improvement.original?.substring(0, 50) || '')) {
            task1Improvements.push(improvement);
          } else if (hasTask2) {
            task2Improvements.push(improvement);
          }
        });
        
        if (task1Improvements.length > 0) {
          structured.task1.feedback.improvements = validateImprovements(task1Improvements, 'task1');
        }
        if (task2Improvements.length > 0) {
          structured.task2.feedback.improvements = validateImprovements(task2Improvements, 'task2');
        }
        
        // Remove legacy field
        delete structured.specific_improvements;
      }
      
      console.log('✅ Response structure validated and enhanced');
      
      // ENHANCED: Validate that scores match band descriptors
      const validateBandDescriptorAlignment = (task: any, taskType: 'task1' | 'task2') => {
        if (!task?.criteria) return;
        
        const criteria = task.criteria;
        const bandLevelGuide = {
          9: { keywords: ['fully and appropriately satisfied', 'all the requirements', 'expert', 'sophisticated'], min: 'perfect' },
          8: { keywords: ['all the requirements', 'well-developed', 'strong', 'skilfully'], min: 'very good' },
          7: { keywords: ['covers the requirements', 'clear', 'developed'], min: 'good' },
          6: { keywords: ['focuses on', 'generally', 'adequately', 'satisfactory'], min: 'competent' },
          5: { keywords: ['generally addresses', 'limited', 'basic', 'some'], min: 'modest' },
          4: { keywords: ['attempt', 'minimal', 'few', 'little'], min: 'very limited' },
        };
        
        for (const [criterion, data] of Object.entries(criteria)) {
          if (data && typeof data.band === 'number' && data.justification) {
            const band = Math.round(data.band);
            const just = data.justification.toLowerCase();
            
            // Check if justification mentions band-appropriate keywords
            const expectedKeywords = bandLevelGuide[band as keyof typeof bandLevelGuide]?.keywords || [];
            const hasKeywords = expectedKeywords.some(kw => just.includes(kw.toLowerCase()));
            
            if (band >= 5 && band <= 9 && !hasKeywords) {
              console.warn(`⚠️ Band ${band} alignment warning for ${criterion}: justification doesn't reference Band ${band} descriptors`);
              console.log(`   Suggestion: Reference the Band ${band} descriptor in justification`);
            }
          }
        }
      };
      
      if (structured.task1) validateBandDescriptorAlignment(structured.task1, 'task1');
      if (structured.task2) validateBandDescriptorAlignment(structured.task2, 'task2');
      console.log('✅ Band descriptor alignment validated');
    }

    const feedback = structured ? 
      `# IELTS Writing Assessment Results\n\n**Overall Band Score: ${structured.overall?.band || 6.0}**\n\n${JSON.stringify(structured, null, 2)}` : 
      content;

    return new Response(JSON.stringify({ 
      success: true, 
      feedback,
      structured,
      apiUsed: modelUsed,
      task1WordCount: hasTask1 && task1Answer ? task1Answer.trim().split(/\s+/).length : 0,
      task2WordCount: hasTask2 && task2Answer ? task2Answer.trim().split(/\s+/).length : 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Error in ielts-writing-examiner function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || 'Unknown error occurred',
      details: error?.toString() || 'No additional details'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});