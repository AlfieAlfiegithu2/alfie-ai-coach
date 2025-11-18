// @ts-nocheck - Deno runtime file, TypeScript errors for Deno imports/globals are expected
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-expect-error - Deno std library import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function callGemini(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting Gemini API call (attempt ${retryCount + 1}/2)...`);
  
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
          temperature: 0.4,
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
      return callGemini(prompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

async function callGeminiViaOpenRouter(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting Gemini 2.5 Flash API call via OpenRouter (attempt ${retryCount + 1}/2)...`);
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
          temperature: 0.4,
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
      return callGeminiViaOpenRouter(prompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

async function callKimiK2Thinking(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting Kimi K2 Thinking API call via OpenRouter (attempt ${retryCount + 1}/2)...`);
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
          temperature: 0.4,
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
      return callKimiK2Thinking(prompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

async function callGPT51ViaOpenRouter(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting GPT-5.1 API call via OpenRouter (attempt ${retryCount + 1}/2)...`);
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
          temperature: 0.4,
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
      return callGPT51ViaOpenRouter(prompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS - Extracted for better code organization
// ============================================================================

/**
 * Parse AI response content, handling markdown code blocks and malformed JSON
 * @param content Raw AI response content
 * @returns Parsed JSON object or null if parsing fails
 */
function parseAIResponse(content: string): any | null {
  try {
    const parsed = JSON.parse(content);
    console.log('✅ Successfully parsed structured response');
    return parsed;
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
        const parsed = JSON.parse(extractedJson);
        console.log('✅ Successfully parsed extracted JSON');
        return parsed;
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
          
          const parsed = JSON.parse(fixedJson);
          console.log('✅ Successfully parsed fixed JSON');
          return parsed;
        } catch (fixError) {
          console.log('❌ Final parsing attempt failed:', (fixError as any).message);
          return null;
        }
      }
    }
    
    return null;
  }
}

/**
 * Ensure all criteria are present in task, marking incomplete if missing
 * @param task Task object (task1 or task2)
 * @param type Task type ('task1' or 'task2')
 * @param overall Overall band score for fallback
 */
function ensureCriteria(task: any, type: 'task1' | 'task2', overall: number): void {
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
}

/**
 * Validate score-justification consistency
 * @param criteria Criteria object with band and justification
 * @param criterionName Name of the criterion for logging
 * @returns true if consistent, false if mismatch detected
 */
function validateScoreConsistency(criteria: any, criterionName: string): boolean {
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
    if (levelDiff > 0.5) {
      console.warn(`⚠️ STRICT Score-justification mismatch for ${criterionName}: score=${band}, justification mentions ~${mentionedLevel.level} (diff=${levelDiff})`);
      return false;
    }
  }
  
  return true;
}

/**
 * Validate band descriptor alignment in justifications
 * @param task Task object (task1 or task2)
 * @param taskType Task type ('task1' or 'task2')
 */
function validateBandDescriptorAlignment(task: any, taskType: 'task1' | 'task2'): void {
  if (!task?.criteria) return;
  
  const criteria = task.criteria;
  const bandLevelGuide: Record<number, { keywords: string[]; min: string }> = {
    9: { keywords: ['fully and appropriately satisfied', 'all the requirements', 'expert', 'sophisticated'], min: 'perfect' },
    8: { keywords: ['all the requirements', 'well-developed', 'strong', 'skilfully'], min: 'very good' },
    7: { keywords: ['covers the requirements', 'clear', 'developed'], min: 'good' },
    6: { keywords: ['focuses on', 'generally', 'adequately', 'satisfactory'], min: 'competent' },
    5: { keywords: ['generally addresses', 'limited', 'basic', 'some'], min: 'modest' },
    4: { keywords: ['attempt', 'minimal', 'few', 'little'], min: 'very limited' },
  };
  
  for (const [criterion, data] of Object.entries(criteria)) {
    if (data && typeof (data as any).band === 'number' && (data as any).justification) {
      const band = Math.round((data as any).band);
      const just = ((data as any).justification as string).toLowerCase();
      
      // Check if justification mentions band-appropriate keywords
      const expectedKeywords = bandLevelGuide[band as keyof typeof bandLevelGuide]?.keywords || [];
      const hasKeywords = expectedKeywords.some(kw => just.includes(kw.toLowerCase()));
      
      if (band >= 5 && band <= 9 && !hasKeywords) {
        console.warn(`⚠️ Band ${band} alignment warning for ${criterion}: justification doesn't reference Band ${band} descriptors`);
        console.log(`   Suggestion: Reference the Band ${band} descriptor in justification`);
      }
    }
  }
}

/**
 * Build diff spans for sentence comparison using LCS algorithm
 * @param orig Original sentence
 * @param imp Improved sentence
 * @returns Object with original_spans and corrected_spans arrays
 */
function buildDiffSpans(orig: string, imp: string): { original_spans: any[]; corrected_spans: any[] } {
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
}

/**
 * Process sentence comparisons for a task, ensuring spans match original text
 * @param task Task object (task1 or task2)
 * @param taskAnswer Original task answer text
 * @param taskType Task type identifier ('task1' or 'task2')
 */
function processSentenceComparisons(task: any, taskAnswer: string, taskType: 'task1' | 'task2'): void {
  if (!task) return;
  
  const spanHasImprovement = (spans: any[] | undefined) => Array.isArray(spans) && spans.some(s => s?.status === 'improvement');
  
  const hasSentenceComparisons = Array.isArray(task.sentence_comparisons) && task.sentence_comparisons.length > 0;
  const taskName = taskType === 'task1' ? 'Task 1' : 'Task 2';
  console.log(`🔍 ${taskName} sentence_comparisons check: ${hasSentenceComparisons ? 'PRESENT' : 'MISSING'} (count: ${task.sentence_comparisons?.length || 0})`);
  
  if (!hasSentenceComparisons) {
    console.log(`⚠️ ${taskName} missing sentence_comparisons, generating from improvements...`);
    // Generate sentence_comparisons from improvements if available
    const improvements = task.feedback?.improvements || [];
    if (improvements.length > 0) {
      task.sentence_comparisons = improvements.map((imp: any) => {
        const orig = imp.original || '';
        const impv = imp.improved || orig;
        const d = buildDiffSpans(orig, impv);
        return { original_spans: d.original_spans, corrected_spans: d.corrected_spans };
      });
    } else {
      // Fallback: create from full text
      const sentences = (taskAnswer || '').split(/[.!?]+/).filter(s => s.trim().length > 0);
      task.sentence_comparisons = sentences.map((s: string) => {
        const d = buildDiffSpans(s.trim(), s.trim());
        return { original_spans: d.original_spans, corrected_spans: d.corrected_spans };
      });
    }
  } else {
    // Validate and repair existing sentence_comparisons
    task.sentence_comparisons = task.sentence_comparisons.map((s: any) => {
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
  // Ensure spans match the exact original text to avoid frontend warnings
  const fullOriginal = (taskAnswer || '').trim();
  const fullImproved = task.sentence_comparisons
    .map((sc: any) => (sc.corrected_spans || []).map((s: any) => s.text || '').join(''))
    .join(' ')
    .trim() || fullOriginal;
  
  // Always regenerate to ensure perfect match with original text
  const d = buildDiffSpans(fullOriginal, fullImproved);
  task.original_spans = d.original_spans;
  task.corrected_spans = d.corrected_spans;
  
  // Validate spans match original text exactly
  const spansText = task.original_spans.map((s: any) => s.text || '').join('').trim();
  if (spansText !== fullOriginal) {
    console.warn(`⚠️ ${taskName} spans mismatch detected, regenerating...`);
    const d2 = buildDiffSpans(fullOriginal, fullImproved);
    task.original_spans = d2.original_spans;
    task.corrected_spans = d2.corrected_spans;
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
    
    // Simplified: Only OpenRouter (primary) and Gemini direct (fallback) supported
    console.log('🔑 API Keys check:', {
      hasOpenRouter: !!openRouterApiKey,
      openRouterKeyLength: openRouterApiKey?.length || 0,
      hasGemini: !!geminiApiKey
    });
    
    if (!openRouterApiKey && !geminiApiKey) {
      console.error('❌ No API keys found - need OpenRouter or Gemini API key');
      throw new Error('At least one API key (OpenRouter or Gemini) is required');
    }
    
    if (!openRouterApiKey) {
      console.warn('⚠️ No OpenRouter API key found, will use direct Gemini API');
    } else {
      console.log('✅ OpenRouter API key found, will use OpenRouter models');
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

Your entire analysis must be based on the Custom Band Descriptors provided below. These descriptors are based on detailed analysis of official Band 9, 8, and 7 sample essays. You will first form a holistic, overall impression of the work, and then you will use the specific criteria to justify your scores.

Evaluate the writing against the custom band descriptors provided below. Match each criterion to the band descriptor that best fits the writing's quality. Pay special attention to the specific examples and characteristics mentioned in each band level.

You must perform all analysis yourself. Your expert judgment is the only thing that matters.

Custom Band Descriptors (Based on Analysis of Official Band 9, 8, and 7 Samples)

Task Achievement (Task 1) / Task Response (Task 2):
${trainingType === 'General' || trainingType === 'Academic' ? `**For Task 1:**

9: All requirements are fully and completely satisfied. The response demonstrates complete understanding of the task. Key features (Academic) or bullet points (General Training) are expertly selected, clearly presented, and thoroughly illustrated with specific details and data. The overview (Academic) or purpose (General Training) is crystal clear. Any lapses are extremely rare and do not affect the overall quality.

8: All requirements are appropriately and sufficiently covered. Key features/bullet points are skilfully selected and clearly presented with good illustration. The overview/purpose is clear. There may be occasional minor omissions or lapses, but these do not significantly detract from the response.

7: The requirements are covered adequately. Key features/bullet points are selected and highlighted clearly, though they could be more fully illustrated or extended. The overview/purpose is present but could be clearer. There may be a few omissions or minor lapses. The format is appropriate.

6: The response focuses on task requirements with an appropriate format. Key features/bullet points are covered but may lack detail or precision. Some information may be irrelevant or inaccurate. An overview/purpose is attempted but may be unclear. Some details may be missing or excessive.

5: The response generally addresses the task but may have format issues. Key features/bullet points may not be adequately covered. There may be irrelevant or inaccurate information. The overview/purpose may be unclear. Limited detail in illustration or extension.

4: The response attempts to address the task but format may be inappropriate. Few key features/bullet points are presented, and they may be irrelevant or inaccurate. The purpose may be confused or unclear.

3: The response does not adequately address the task requirements. Key features/bullet points may be largely irrelevant. Limited information is presented, possibly repetitively.

2: The content barely relates to the task.

1: Responses of 20 words or fewer. Content is wholly unrelated to the task.

0: No attempt made, wrong language used, or answer is memorized.

**For Task 2 (Essay) - Applies to both Academic and General Training:**
` : ''}9: The prompt is fully addressed in all parts with complete depth and thoroughness. A clear, fully developed position directly answers the question throughout. Ideas are relevant and fully extended with specific and detailed examples that strongly support the argument. Coverage is complete with no gaps or omissions. The conclusion effectively ties all ideas together. Any lapses in content or support are extremely rare.

8: The prompt is appropriately and sufficiently addressed in all parts. A clear, well-developed position is presented that directly answers the question. Ideas are relevant and well extended with good examples that support the argument. Coverage is good but may have occasional minor omissions or lapses. Development is thorough but may not be as complete or detailed as Band 9. The conclusion ties ideas together well.

7: The main parts of the prompt are appropriately addressed. A clear and developed position is presented. Main ideas are extended and supported with examples, though they may lack detail or precision. There may be a tendency to over-generalise or a lack of focus in supporting material. Some parts may be less fully developed than others. The conclusion is present but may be less effective.

6: The main parts are addressed, though some may be more fully covered than others. A position is presented that is relevant to the prompt, though conclusions may be unclear or repetitive. Main ideas are relevant but some may be insufficiently developed or lack clarity. Examples are present but may be less detailed or less effectively integrated.

5: The main parts are incompletely addressed. A position is expressed but development is not always clear. Some main ideas are limited and not sufficiently developed. Examples may be present but are basic and lack detail. There may be irrelevant detail or repetition. The conclusion may be present but is weak.

4: The prompt is tackled minimally or tangentially. A position is discernible but the reader must search for it. Main ideas are difficult to identify and may lack relevance, clarity, or support. Examples may be present but are very basic, unclear, or irrelevant. Large parts may be repetitive.

3: No part is adequately addressed or the prompt is misunderstood. No relevant position can be identified. Few ideas, possibly irrelevant or insufficiently developed.

2: Content barely related to the prompt. No position identifiable. May have glimpses of one or two undeveloped ideas.

1: Responses of 20 words or fewer. Content wholly unrelated to the prompt.

0: No attempt made, wrong language used, or answer is memorized.

Coherence & Cohesion (Applies to both Academic and General Training, Task 1 and Task 2):
9: The message can be followed EFFORTLESSLY without any confusion. Cohesion is used so naturally that it is INVISIBLE - transitions don't draw attention at all. Paragraph structure is perfect with each paragraph having one distinct main idea. Ideas progress logically and build naturally from one to the next. The flow is seamless and natural. Any lapses in coherence or cohesion are minimal or non-existent. Paragraphing is skilfully managed.

8: The message can be followed with EASE. Information and ideas are logically sequenced, and cohesion is WELL MANAGED. Transitions are clear and natural, though they may be slightly more noticeable than Band 9 (not as invisible). Paragraph structure is clear with distinct main ideas. Ideas progress logically and build well. The flow is smooth and natural. Occasional minor lapses in coherence or cohesion may occur but don't significantly affect understanding. Paragraphing is used sufficiently and appropriately.

7: Information and ideas are logically organised with a clear progression throughout. Structure is clear but may be less sophisticated than Band 8. A range of cohesive devices is used, though there may be some inaccuracies or over/under use. Transitions are present but may feel slightly mechanical or formulaic at times (e.g., "First of all", "To start with", "Furthermore", "In conclusion"). Paragraphing is generally used effectively, though some paragraphs may lack clear focus. A few minor lapses may occur but don't impede understanding.

6: Information and ideas are generally arranged coherently with a clear overall progression. Cohesive devices are used but may be faulty or mechanical due to misuse, overuse, or omission (e.g., "On the other hands" instead of "On the other hand", awkward transitions). Transitions may feel forced or mechanical. Paragraphing is present but may not always be logical, and central topics may not always be clear. The structure is generally clear but less sophisticated than Band 7.

5: Organisation is evident but not wholly logical. There may be a lack of overall progression. Ideas can be followed but sentences are not fluently linked. Cohesive devices may be limited or inaccurate (e.g., awkward transitions like "In first point of view", "In second point", "In nutshell" instead of "In a nutshell"). Paragraphing may be inadequate or missing. Transitions are awkward and may confuse the reader.

4: Information and ideas are evident but not arranged coherently. No clear progression. Relationships between ideas are unclear. Basic cohesive devices may be inaccurate or repetitive (e.g., "Further more" instead of "Furthermore", "On the contrary" used incorrectly, "Conclusion" instead of "In conclusion"). Paragraphing may be attempted but lacks clear structure or main topics. Ideas jump around without logical flow.

3: No apparent logical organisation. Ideas are difficult to relate. Minimal use of cohesive devices. Paragraphing attempts are unhelpful.

2: Little relevant message or response is off-topic. Little evidence of organisational control.

1: Responses of 20 words or fewer. Writing fails to communicate any message.

0: No attempt made.

Lexical Resource (Applies to both Academic and General Training, Task 1 and Task 2):
9: Vocabulary demonstrates sophisticated control with precise, natural word choice. Wide range of uncommon items used accurately with full flexibility and precision. No errors in word choice, collocation, or spelling. Sophisticated vocabulary used appropriately without being showy.

8: Skilful use of uncommon and idiomatic items with fluent, flexible vocabulary control. Word choice is natural and appropriate with occasional minor inaccuracies. Vocabulary is varied and demonstrates good control. Occasional minor errors in spelling or word formation may occur but have minimal impact.

7: Sufficient vocabulary for flexibility and precision with some use of less common items. Adequate word choice with occasional inappropriacies. An awareness of style and collocation is evident though errors occur. Few errors in spelling or word formation that don't detract from overall clarity.

6: Generally adequate vocabulary with clear meaning but restricted range. Some imprecise word choice and occasional errors in spelling or word formation. Errors don't impede communication but may reduce sophistication.

5: Limited vocabulary with noticeable errors in appropriacy, word choice, and spelling. Range doesn't permit much variation. Frequent lapses that cause difficulty for the reader.

4: Very limited vocabulary with frequent errors that impede meaning. Basic vocabulary used repetitively with inappropriate word choice and awkward phrasing.

3: Vocabulary is inadequate. Over-dependence on memorised language. Errors predominate and may severely impede meaning.

2: Vocabulary is extremely limited. Few recognisable strings apart from memorised phrases.

1: Responses of 20 words or fewer. No resource apparent except isolated words.

0: No attempt made.

Grammatical Range and Accuracy (Applies to both Academic and General Training, Task 1 and Task 2):
9: A wide range of grammatical structures is used with full flexibility and control. Complex structures are used accurately and naturally. Grammar is error-free throughout with appropriate punctuation. Sentence variety prevents repetition and structures flow effortlessly. Minor errors are extremely rare.

8: A wide range of structures is used flexibly and accurately. Complex structures are used correctly with the majority of sentences error-free. Punctuation is well managed. Occasional non-systematic errors may occur but have minimal impact. Structures are varied and natural.

7: A variety of complex structures is used with some flexibility and accuracy. Grammar and punctuation are generally well controlled with error-free sentences being frequent. A few errors may occur but do not impede communication. Sentence variety is present but may be less sophisticated.

6: A mix of simple and complex sentence forms is used but flexibility is limited. Complex structures may not be as accurate as simple ones. Some errors in grammar and punctuation occur but rarely impede communication. Sentence variety is present but less sophisticated.

5: Range is limited and repetitive with complex sentences attempted but often faulty. Greatest accuracy on simple sentences. Grammatical errors are frequent and may cause difficulty for the reader, impeding understanding at times.

4: Very limited range with subordinate clauses rare and simple sentences predominating. Grammatical errors are frequent and impede meaning significantly.

3: Sentence forms attempted but errors predominate. Prevents most meaning from coming through.

2: Little or no evidence of sentence forms except memorised phrases.

1: Responses of 20 words or fewer. No rateable language evident.

0: No attempt made.

Your Required Tasks & Output Format

${hasTask1 && hasTask2 ? 'After analyzing the provided Task 1 and Task 2 essays, you must return a single, valid JSON object.' : hasTask1 ? 'After analyzing the provided Task 1 essay, you must return a single, valid JSON object. ONLY analyze Task 1 - Task 2 was skipped by the student.' : 'After analyzing the provided Task 2 essay, you must return a single, valid JSON object. ONLY analyze Task 2 - Task 1 was skipped by the student.'}

Score Each Criterion: ${hasTask1 && hasTask2 ? 'For both Task 1 and Task 2' : hasTask1 ? 'For Task 1 only' : 'For Task 2 only'}, provide a band score for each of the four criteria based on the descriptors above.

Band scores should be realistic and reflect the quality of the writing. Use your expert judgment to assign scores that best match the descriptors provided.

CRITICAL: YOU MUST ASSESS EACH CRITERION COMPLETELY INDEPENDENTLY. Do NOT let one criterion's score influence another. Score each criterion separately based ONLY on its own specific evidence:

- Task Response/Task Achievement: Evaluate ONLY how well the prompt is addressed, idea development, and example quality. Ignore grammar/vocabulary errors when scoring this.
- Coherence & Cohesion: Evaluate ONLY organization, transitions, and paragraph structure. Ignore task response quality when scoring this.
- Lexical Resource: Evaluate ONLY vocabulary range, precision, spelling, and word choice errors. Ignore grammar errors when scoring this.
- Grammatical Range and Accuracy: Evaluate ONLY structure variety, accuracy, and grammar errors. Ignore vocabulary quality when scoring this.

MANDATORY: Before finalizing scores, ask yourself: "Do I have SPECIFIC, DIFFERENT evidence for each criterion, or am I unconsciously matching scores?" If all four criteria have the same score, you MUST verify that each criterion genuinely demonstrates the SAME level of performance. It is VERY RARE for all four criteria to be identical. If you find yourself giving the same score to all criteria, STOP and reassess each one independently.

REMEMBER: It is NORMAL and EXPECTED for criteria to have DIFFERENT scores. Do NOT force them to match. Examples:
- Strong ideas but weaker grammar → Task Response 8.0, Grammar 7.0
- Good vocabulary but mechanical transitions → Lexical 8.0, Coherence 7.0
- Perfect grammar but limited vocabulary → Grammar 8.0, Lexical 7.0
- Clear structure but frequent errors → Coherence 7.0, Grammar 6.0
- Well-developed ideas but formulaic vocabulary → Task Response 8.0, Lexical 7.0

For each score, provide a justification (3-4 sentences) that:
1. References the band descriptor your score matches
2. Quotes specific examples from the student's writing showing why this band applies
3. Explains why this band is appropriate based on what the writing demonstrates FOR THIS SPECIFIC CRITERION

CRITICAL: If the writing clearly demonstrates Band 8 characteristics for a specific criterion (e.g., "well managed" cohesion, "skilful use" of vocabulary, "wide range" of structures), score Band 8 for THAT criterion. Do not downgrade to Band 7 based on vague or minor issues. Recognize what IS present in the writing for each criterion, not what might be missing.

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
Student Letter: "${task1Answer}"

**CRITICAL:** Evaluate this as a LETTER. Task Achievement must consider: (1) whether all requirements are addressed, (2) whether the tone and register are appropriate for the situation and relationship, and (3) whether the letter format is appropriate (salutation, closing, paragraphing).` : `DATA DESCRIPTION (Academic)
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Visual Data: ${task1Data.imageContext}` : ''}
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

    // SIMPLIFIED: Route to correct model with single fallback
    let aiResponse: any;
    let modelUsed: string;
    let content: string;
    
    const selectedModel = model || 'gemini-2.5-flash';
    console.log(`🎯 Selected model: ${selectedModel}`);
    
    try {
      // Primary: Try OpenRouter models if key available
      if (openRouterApiKey) {
        if (selectedModel === 'kimi-k2-thinking') {
          console.log('🔄 Using Kimi K2 Thinking (OpenRouter)...');
          aiResponse = await callKimiK2Thinking(masterExaminerPrompt, openRouterApiKey);
          modelUsed = 'Kimi K2 Thinking (OpenRouter)';
          content = aiResponse.choices?.[0]?.message?.content ?? '';
        } else if (selectedModel === 'gpt-5.1' || selectedModel === 'chatgpt-5.1') {
          console.log('🔄 Using GPT-5.1 (OpenRouter)...');
          aiResponse = await callGPT51ViaOpenRouter(masterExaminerPrompt, openRouterApiKey);
          modelUsed = 'GPT-5.1 (OpenRouter)';
          content = aiResponse.choices?.[0]?.message?.content ?? '';
        } else {
          // Default: Gemini 2.5 Flash via OpenRouter
          console.log('🔄 Using Gemini 2.5 Flash (OpenRouter)...');
          aiResponse = await callGeminiViaOpenRouter(masterExaminerPrompt, openRouterApiKey);
          modelUsed = 'Gemini 2.5 Flash (OpenRouter)';
          content = aiResponse.choices?.[0]?.message?.content ?? '';
        }
        console.log(`✅ ${modelUsed} succeeded`);
        console.log(`📝 Response length: ${content.length} characters`);
      } else if (geminiApiKey) {
        // Fallback: Direct Gemini API if no OpenRouter key
        console.log('🔄 Using Gemini API (direct - no OpenRouter key)...');
        aiResponse = await callGemini(masterExaminerPrompt, geminiApiKey);
        modelUsed = 'Google Gemini AI';
        content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        console.log('✅ Gemini API succeeded');
      } else {
        throw new Error('No API keys available - need OpenRouter or Gemini API key');
      }
    } catch (primaryError) {
      // Single fallback: Try direct Gemini if OpenRouter failed
      if (openRouterApiKey && geminiApiKey) {
        console.error(`❌ ${selectedModel} (OpenRouter) failed:`, (primaryError as any).message);
        console.log('🔄 Falling back to direct Gemini API...');
        try {
          aiResponse = await callGemini(masterExaminerPrompt, geminiApiKey);
          modelUsed = 'Google Gemini AI (Fallback)';
          content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          console.log('✅ Gemini fallback succeeded');
        } catch (fallbackError) {
          throw new Error(`All models failed. OpenRouter error: ${(primaryError as any).message}. Gemini error: ${(fallbackError as any).message}`);
        }
      } else {
        throw primaryError;
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

    // Use helper function to parse AI response
    let structured: any = parseAIResponse(content);

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
    // IELTS rounding rules:
    // - 0.0 to < 0.25 → rounds down to .0
    // - 0.25 to < 0.75 → rounds to .5
    // - 0.75 to 1.0 → rounds up to next .0
    const roundIELTS = (n: number) => {
      // Handle invalid inputs (NaN, Infinity, null, undefined)
      if (typeof n !== 'number' || !isFinite(n) || isNaN(n)) {
        console.warn(`⚠️ Invalid number passed to roundIELTS: ${n}, defaulting to 0`);
        return 0;
      }
      
      const clamped = Math.min(9, Math.max(0, n));
      const floor = Math.floor(clamped);
      const decimal = clamped - floor;
      
      if (decimal < 0.25) {
        return floor; // Round down to .0
      } else if (decimal < 0.75) {
        return floor + 0.5; // Round to .5
      } else {
        return floor + 1.0; // Round up to next .0
      }
    };

    // Validate and add fallback data for frontend compatibility
    if (structured) {
      // Use helper function to ensure all criteria are present
      const overall = typeof structured?.overall?.band === 'number' ? structured.overall.band : 6.5;
      ensureCriteria(structured.task1 || (structured.task1 = {}), 'task1', overall);
      ensureCriteria(structured.task2 || (structured.task2 = {}), 'task2', overall);

      const isValidBand = (n: any) => typeof n === 'number' && isFinite(n) && !isNaN(n) && n >= 0 && n <= 9 && (n * 2) % 1 === 0;
      const isValidBandValue = (n: any) => typeof n === 'number' && isFinite(n) && !isNaN(n) && n >= 0 && n <= 9;
      const getTaskBands = (task: any, type: 'task1' | 'task2') => {
        const c = task?.criteria || {};
        const b1 = type === 'task1' ? c?.task_achievement?.band : c?.task_response?.band;
        const b2 = c?.coherence_and_cohesion?.band;
        const b3 = c?.lexical_resource?.band;
        const b4 = c?.grammatical_range_and_accuracy?.band;
        return [b1, b2, b3, b4];
      };

      // CRITICAL FIX: Round and validate all criterion scores
      const roundAndValidateScores = (task: any, type: 'task1' | 'task2') => {
        if (!task?.criteria) return;
        
        const criteriaNames = type === 'task1' 
          ? ['task_achievement', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy']
          : ['task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy'];
        
        for (const criterionName of criteriaNames) {
          const criterion = task.criteria[criterionName];
          if (criterion && typeof criterion.band === 'number') {
            const originalBand = criterion.band;
            // Round to valid IELTS increment
            const rounded = roundIELTS(originalBand);
            
            // Validate the rounded score
            if (!isValidBand(rounded)) {
              console.warn(`⚠️ Invalid band score for ${type}.${criterionName}: ${rounded}, clamping to valid range`);
              criterion.band = Math.max(0, Math.min(9, Math.round(rounded * 2) / 2));
            } else {
              criterion.band = rounded;
            }
            
            // Log if score was changed
            if (Math.abs(originalBand - rounded) > 0.01) {
              console.log(`📊 Rounded ${type}.${criterionName} from ${originalBand} to ${rounded}`);
            }
          }
        }
      };

      // Round and validate scores for both tasks
      if (hasTask1 && structured.task1) {
        roundAndValidateScores(structured.task1, 'task1');
      }
      if (hasTask2 && structured.task2) {
        roundAndValidateScores(structured.task2, 'task2');
      }

      // CRITICAL FIX: Calculate task-level overall_band scores
      if (hasTask1 && structured.task1) {
        const t1Bands = getTaskBands(structured.task1, 'task1').filter((b) => isValidBandValue(b)) as number[];
        if (t1Bands.length === 4) {
          structured.task1.overall_band = roundIELTS((t1Bands[0] + t1Bands[1] + t1Bands[2] + t1Bands[3]) / 4);
          console.log(`📊 Task 1 overall_band calculated: ${structured.task1.overall_band} (from ${t1Bands.join(', ')})`);
        } else if (t1Bands.length > 0) {
          console.warn(`⚠️ Task 1 has only ${t1Bands.length} valid band scores, cannot calculate overall_band`);
        }
      }
      
      if (hasTask2 && structured.task2) {
        const t2Bands = getTaskBands(structured.task2, 'task2').filter((b) => isValidBandValue(b)) as number[];
        if (t2Bands.length === 4) {
          structured.task2.overall_band = roundIELTS((t2Bands[0] + t2Bands[1] + t2Bands[2] + t2Bands[3]) / 4);
          console.log(`📊 Task 2 overall_band calculated: ${structured.task2.overall_band} (from ${t2Bands.join(', ')})`);
        } else if (t2Bands.length > 0) {
          console.warn(`⚠️ Task 2 has only ${t2Bands.length} valid band scores, cannot calculate overall_band`);
        }
      }

      // CRITICAL FIX: Calculate overall band score (Task 1 = 1/3, Task 2 = 2/3 weighting)
      const hasTask1Band = isValidBandValue(structured.task1?.overall_band);
      const hasTask2Band = isValidBandValue(structured.task2?.overall_band);
      
      if (hasTask1Band && hasTask2Band) {
        // Both tasks completed - use standard IELTS weighting (Task 1 = 1/3, Task 2 = 2/3)
        structured.overall = structured.overall || {};
        structured.overall.band = roundIELTS((structured.task1.overall_band + 2 * structured.task2.overall_band) / 3);
        structured.overall.calculation = `Weighted average: (${structured.task1.overall_band} + 2 × ${structured.task2.overall_band}) / 3 = ${structured.overall.band}`;
        console.log(`📊 Overall band calculated: ${structured.overall.band} (Task 1: ${structured.task1.overall_band}, Task 2: ${structured.task2.overall_band})`);
      } else if (hasTask1Band) {
        // Only Task 1 completed
        structured.overall = structured.overall || {};
        structured.overall.band = structured.task1.overall_band;
        structured.overall.calculation = 'Task 1 only (Task 2 was skipped)';
        console.log(`📊 Overall band (Task 1 only): ${structured.overall.band}`);
      } else if (hasTask2Band) {
        // Only Task 2 completed
        structured.overall = structured.overall || {};
        structured.overall.band = structured.task2.overall_band;
        structured.overall.calculation = 'Task 2 only (Task 1 was skipped)';
        console.log(`📊 Overall band (Task 2 only): ${structured.overall.band}`);
      } else {
        // Fallback: calculate from individual criteria if overall_band not available
        console.warn('⚠️ No task-level overall_band available, attempting to calculate from criteria...');
        const t1Bands = hasTask1 && structured.task1 ? getTaskBands(structured.task1, 'task1').filter((b) => isValidBandValue(b)) as number[] : [];
        const t2Bands = hasTask2 && structured.task2 ? getTaskBands(structured.task2, 'task2').filter((b) => isValidBandValue(b)) as number[] : [];
        
        if (t1Bands.length === 4 && t2Bands.length === 4) {
          const t1Avg = roundIELTS((t1Bands[0] + t1Bands[1] + t1Bands[2] + t1Bands[3]) / 4);
          const t2Avg = roundIELTS((t2Bands[0] + t2Bands[1] + t2Bands[2] + t2Bands[3]) / 4);
          structured.overall = structured.overall || {};
          structured.overall.band = roundIELTS((t1Avg + 2 * t2Avg) / 3);
          structured.overall.calculation = `Calculated from criteria (Task 1: ${t1Avg}, Task 2: ${t2Avg})`;
        } else if (t1Bands.length === 4) {
          structured.overall = structured.overall || {};
          structured.overall.band = roundIELTS((t1Bands[0] + t1Bands[1] + t1Bands[2] + t1Bands[3]) / 4);
          structured.overall.calculation = 'Task 1 only (calculated from criteria)';
        } else if (t2Bands.length === 4) {
          structured.overall = structured.overall || {};
          structured.overall.band = roundIELTS((t2Bands[0] + t2Bands[1] + t2Bands[2] + t2Bands[3]) / 4);
          structured.overall.calculation = 'Task 2 only (calculated from criteria)';
        } else {
          // Last resort fallback
          structured.overall = structured.overall || {};
          structured.overall.band = 6.0;
          structured.overall.calculation = 'Fallback default (insufficient data)';
          console.warn(`⚠️ Using fallback overall band score of 6.0 (Task 1: ${t1Bands.length} valid scores, Task 2: ${t2Bands.length} valid scores)`);
        }
      }

      // Use helper function to validate score-justification consistency

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
` : ''}
${hasTask2 ? `Task 2:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}
Student Response: "${task2Answer}"
` : ''}
Use official IELTS band descriptors. Return ONLY the JSON object, no additional text. ${hasTask1 && !hasTask2 ? 'ONLY analyze Task 1 - Task 2 was skipped.' : !hasTask1 && hasTask2 ? 'ONLY analyze Task 2 - Task 1 was skipped.' : ''}`;

        // SIMPLIFIED: Parallel rescoring - only Gemini (OpenRouter disabled, so rescoring disabled)
        // This function is kept for reference but rescoring is disabled above
        const tryRescoreParallel = async (): Promise<any | null> => {
          const promises: Promise<any>[] = [];
          
          if (geminiApiKey) {
            promises.push(
              callGemini(scoringPrompt, geminiApiKey)
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
      
      // Use helper functions to process sentence comparisons
      if (hasTask1 && structured.task1) {
        processSentenceComparisons(structured.task1, task1Answer, 'task1');
      }
      if (hasTask2 && structured.task2) {
        processSentenceComparisons(structured.task2, task2Answer, 'task2');
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
      
      // Use helper function to validate band descriptor alignment
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