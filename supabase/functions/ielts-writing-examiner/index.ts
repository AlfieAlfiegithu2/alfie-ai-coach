import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// UNIFIED API CALLER - Consolidates all provider logic into one function
// ============================================================================
type Provider = 'gemini' | 'deepseek' | 'openai';

interface ApiConfig {
  provider: Provider;
  apiKey: string;
  prompt: string;
}

async function callLLM(config: ApiConfig, retryCount = 0): Promise<string> {
  const { provider, apiKey, prompt } = config;
  const maxRetries = 1;

  console.log(`🚀 Attempting ${provider} API call (attempt ${retryCount + 1}/${maxRetries + 1})...`);

  try {
    let response: Response;
    let contentPath: string[];

    if (provider === 'gemini') {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8000,
              topP: 0.9,
              topK: 50
            }
          }),
        }
      );
      contentPath = ['candidates', '0', 'content', 'parts', '0', 'text'];
    } else if (provider === 'deepseek') {
      response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-reasoner',
          messages: [
            { role: 'system', content: 'You are an expert IELTS examiner. Return ONLY valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000
        })
      });
      contentPath = ['choices', '0', 'message', 'content'];
    } else { // openai
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert IELTS examiner. Return ONLY valid JSON.'
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 4000
        }),
      });
      contentPath = ['choices', '0', 'message', 'content'];
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${provider} API Error:`, errorText);
      throw new Error(`${provider} API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Navigate to content using the path
    let content = data as any;
    for (const key of contentPath) {
      content = content?.[key];
    }

    if (!content || typeof content !== 'string') {
      throw new Error(`${provider} returned invalid content structure`);
    }

    console.log(`✅ ${provider} API call successful`);
    return content;

  } catch (error) {
    console.error(`❌ ${provider} attempt ${retryCount + 1} failed:`, (error as any).message);

    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying ${provider} API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callLLM(config, retryCount + 1);
    }

    throw error;
  }
}

// ============================================================================
// HELPERS
// ============================================================================
function getNestedValue(obj: any, path: string[]): any {
  let value = obj;
  for (const key of path) {
    value = value?.[key];
  }
  return value;
}

function extractJson(content: string): any {
  let cleaned = content.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);

  if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
  cleaned = cleaned.trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in response');
  }

  const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);

  // Try to fix common JSON issues
  let fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    fixed += '}'.repeat(openBraces - closeBraces);
  }

  return JSON.parse(fixed);
}

const roundIELTS = (n: number) => Math.min(9, Math.max(0, Math.round(n * 2) / 2));

// ============================================================================
// CONSOLIDATE PROMPT GENERATION - DRY approach
// ============================================================================
function generateCriteriaSchema(taskType: '1' | '2') {
  const iTask1 = taskType === '1';
  const primaryKey = iTask1 ? 'task_achievement' : 'task_response';
  const primaryDesc = iTask1
    ? 'Fully satisfies all requirements. A fully developed and comprehensive response.'
    : 'Fully addresses the prompt and provides a well-developed, coherent response.';

  return {
    [primaryKey]: {
      band: 6.5,
      justification: 'Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum.'
    },
    coherence_and_cohesion: {
      band: 6.5,
      justification: 'Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum.'
    },
    lexical_resource: {
      band: 6.5,
      justification: 'Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum.'
    },
    grammatical_range_and_accuracy: {
      band: 6.5,
      justification: 'Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum.'
    }
  };
}

function generateMasterPrompt(
  task1Answer: string,
  task2Answer: string,
  task1Data: any,
  task2Data: any,
  targetLanguage?: string
): string {
  const languageInstruction = targetLanguage
    ? `
IMPORTANT LANGUAGE INSTRUCTION:
You MUST provide all feedback, explanations, justifications, and improvement descriptions in ${
      targetLanguage === 'zh' ? 'Chinese (中文)' :
      targetLanguage === 'es' ? 'Spanish (Español)' :
      targetLanguage === 'fr' ? 'French (Français)' :
      targetLanguage === 'de' ? 'German (Deutsch)' :
      targetLanguage === 'ja' ? 'Japanese (日本語)' :
      targetLanguage === 'ko' ? 'Korean (한국어)' :
      targetLanguage === 'ar' ? 'Arabic (العربية)' :
      targetLanguage === 'pt' ? 'Portuguese (Português)' :
      targetLanguage === 'ru' ? 'Russian (Русский)' :
      targetLanguage === 'hi' ? 'Hindi (हिन्दी)' :
      targetLanguage === 'vi' ? 'Vietnamese (Tiếng Việt)' : 'English'}.

CRITICAL: Keep the following in ENGLISH:
- The student's original writing (task1Answer and task2Answer)
- All quoted text from the student's writing in the "original" field
- Your improved versions in the "improved" field
- IELTS terminology (e.g., "Task Achievement", "Coherence and Cohesion", "Lexical Resource", "Grammatical Range and Accuracy", "Band Score")
- Technical terms like "IELTS", "Task 1", "Task 2"
`
    : '';

  const task1WordCount = task1Answer.trim().split(/\s+/).length;
  const task2WordCount = task2Answer.trim().split(/\s+/).length;

  return `Core Principles & Directives
${languageInstruction}

You are an expert IELTS examiner with 15+ years of experience. Your task is to provide a comprehensive, fair, and accurate assessment of an IELTS Writing submission (both Task 1 and Task 2).

1. Preserve the Student's Original Ideas and Arguments:
This is your most important rule. You must never change the core meaning, opinion, or arguments of the student's essay.
Your role is to improve how the ideas are expressed, not what the ideas are. You will elevate their language, grammar, and structure, but the student's original voice and perspective must remain intact.

2. Implement Precise, Word-for-Word Highlighting:
When you generate the sentence_comparisons and the improvements array, your feedback must be granular.
For each improvement, isolate and tag only the specific words or short phrases that have been changed. Do not highlight entire sentences if only a few words were improved.

3. CRITICAL: Be STRICT and ACCURATE in Your Scoring:
Do not inflate scores out of kindness or optimism. If the writing demonstrates basic errors, limited vocabulary, or poor organization, score accordingly. A 6.5 should represent genuinely good writing, not average writing. Be honest and objective - this helps students understand their true level and areas for improvement.

Your entire analysis must be based on the Official IELTS Band Descriptors provided below.

Official IELTS Band Descriptors (Complete 0-9 Scale)

Task Achievement (Task 1) / Task Response (Task 2):
9: Fully satisfies all requirements. A fully developed and comprehensive response.
8: Sufficiently covers all requirements. A well-developed response.
7: Addresses all parts of the prompt, though some may be more developed than others.
6: Addresses the prompt, but the treatment is more general and may be underdeveloped.
5: Partially addresses the prompt. Ideas are limited and not well-supported.
4: Responds to the task only in a minimal way. Content is often irrelevant.
3: Fails to address the task. Ideas are largely irrelevant to the prompt.
2: Response is barely related to the task. The writer has failed to understand the prompt.
1: Fails to attend to the task at all. The content has no relation to the question.
0: Did not attend, or wrote a response that is completely memorized and unrelated.

Coherence & Cohesion:
9: Uses cohesion seamlessly and naturally. Paragraphing is flawless.
8: Information is sequenced logically. Paragraphing is well-managed.
7: Logically organized with clear progression. Uses a range of cohesive devices.
6: Organization is apparent but can be mechanical or repetitive.
5: Some organization, but not logical. Paragraphing is confusing. Causes significant difficulty for the reader.
4: Not logically organized. Very limited and incorrect use of linking words.
3: Ideas are disconnected. No logical progression.
2: Has very little control of organizational features.
1: Fails to communicate any message.
0: Did not attend.

Lexical Resource (Vocabulary):
9: Wide range of vocabulary used with very natural and sophisticated control.
8: Wide vocabulary used fluently and flexibly. Skillfully uses less common vocabulary.
7: Sufficient range of vocabulary with some flexibility. Attempts less common vocabulary.
6: Vocabulary is adequate for the task. Errors do not generally impede communication.
5: Limited and repetitive vocabulary. Frequent errors cause difficulty for the reader.
4: Uses only very basic vocabulary. Errors cause severe difficulty.
3: Extremely limited vocabulary. Severe errors distort meaning.
2: Can only use isolated words.
1: No evidence of any vocabulary knowledge.
0: Did not attend.

Grammatical Range and Accuracy:
9: Wide range of structures used with full flexibility and accuracy. Almost entirely error-free.
8: Wide range of structures. The majority of sentences are error-free.
7: Uses a variety of complex sentence structures, but with some errors.
6: Uses a mix of simple and complex sentences. Some errors, but they rarely reduce communication.
5: Limited range of structures. Frequent errors cause some difficulty for the reader.
4: Uses only very basic sentence structures. Frequent errors cause significant confusion.
3: Cannot produce basic sentence forms.
2: Cannot write in sentences at all.
1: No evidence of sentence structure.
0: Did not attend.

Your Required Tasks & Output Format

After analyzing Task 1 and Task 2, return a single valid JSON object with:
1. Band scores (0.0-9.0, in 0.5 increments) for each criterion
2. 2-3 sentence justifications quoting specific examples
3. 3-5 improvements per task addressing different aspects
4. Overall band calculation

Task 1:
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Visual Data: ${task1Data.imageContext}` : ''}
Word Count: ${task1WordCount}
Student Response: "${task1Answer}"

Task 2:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}
Word Count: ${task2WordCount}
Student Response: "${task2Answer}"

JSON SCHEMA:
{
  "task1": {
    "criteria": ${JSON.stringify(generateCriteriaSchema('1'), null, 2)},
    "feedback": {
      "improvements": [
        {
          "issue": "Issue Title",
          "original": "Quote from student writing",
          "improved": "Your improved version",
          "explanation": "Why this is better"
        }
      ],
      "feedback_markdown": "## Task 1 Detailed Feedback..."
    },
    "overall_band": 6.5,
    "word_count": ${task1WordCount}
  },
  "task2": {
    "criteria": ${JSON.stringify(generateCriteriaSchema('2'), null, 2)},
    "feedback": {
      "improvements": [...],
      "feedback_markdown": "## Task 2 Detailed Feedback..."
    },
    "overall_band": 6.5,
    "word_count": ${task2WordCount}
  },
  "overall": {
    "band": 6.5,
    "calculation": "Weighted average explanation"
  }
}

IMPORTANT: Follow band descriptors precisely. If task is under word count (150 for Task 1, 250 for Task 2), reflect this in your scoring.`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task1Answer, task2Answer, task1Data, task2Data, apiProvider = 'gemini', targetLanguage } = await req.json();

    const hasTask1 = task1Answer && task1Answer.trim() !== '' && task1Answer !== 'Not completed';
    const hasTask2 = task2Answer && task2Answer.trim() !== '' && task2Answer !== 'Not completed';

    if (!hasTask1 && !hasTask2) {
      throw new Error('At least one task answer is required');
    }

    console.log('🔍 AI Examiner Request:', {
      task1Length: task1Answer?.length || 0,
      task2Length: task2Answer?.length || 0,
      provider: apiProvider,
      targetLanguage: targetLanguage || 'en'
    });

    const masterExaminerPrompt = generateMasterPrompt(
      task1Answer || '',
      task2Answer || '',
      task1Data,
      task2Data,
      targetLanguage
    );

    // ========================================================================
    // OPTIMIZED API STRATEGY: Primary → Fallback only (NO rescoring loop)
    // ========================================================================
    let aiResponse: string;
    let modelUsed: string;
    let primaryProvider: Provider = apiProvider as Provider;

    // Validate API keys for selected provider
    if (primaryProvider === 'openai' && !Deno.env.get('OPENAI_API_KEY')) {
      throw new Error('OpenAI API key is required for selected provider');
    }

    if (primaryProvider === 'gemini' && !Deno.env.get('GEMINI_API_KEY')) {
      throw new Error('Gemini API key is required');
    }

    // Try primary provider, fallback to DeepSeek only
    try {
      if (primaryProvider === 'gemini' || primaryProvider === 'deepseek' || primaryProvider === 'openai') {
        console.log(`🔄 Using ${primaryProvider} API...`);
        const apiKey = 
          primaryProvider === 'gemini' ? Deno.env.get('GEMINI_API_KEY')! :
          primaryProvider === 'openai' ? Deno.env.get('OPENAI_API_KEY')! :
          Deno.env.get('DEEPSEEK_API_KEY')!;

        aiResponse = await callLLM({ provider: primaryProvider, apiKey, prompt: masterExaminerPrompt });
        modelUsed = primaryProvider.toUpperCase();
        console.log(`✅ ${primaryProvider} succeeded`);
      } else {
        throw new Error(`Unknown API provider: ${primaryProvider}`);
      }
    } catch (primaryError) {
      // Only fallback to DeepSeek if primary fails AND it's not already DeepSeek
      if (primaryProvider !== 'deepseek') {
        console.log(`⚠️ ${primaryProvider} failed, falling back to DeepSeek...`);
        const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
        if (!deepseekKey) {
          throw new Error(`${primaryProvider} failed and no DEEPSEEK_API_KEY available for fallback`);
        }

        aiResponse = await callLLM({
          provider: 'deepseek',
          apiKey: deepseekKey,
          prompt: masterExaminerPrompt
        });
        modelUsed = 'DeepSeek (Fallback)';
        console.log('✅ DeepSeek fallback succeeded');
      } else {
        throw primaryError;
      }
    }

    console.log('🔍 Raw API response content length:', aiResponse.length);

    if (!aiResponse || aiResponse.length < 10) {
      throw new Error('API returned empty or invalid response');
    }

    // Parse JSON response
    let structured: any = null;
    try {
      structured = JSON.parse(aiResponse);
      console.log('✅ Successfully parsed structured response');
    } catch (_e) {
      console.log('⚠️ Failed to parse JSON directly, attempting extraction...');
      try {
        structured = extractJson(aiResponse);
        console.log('✅ Successfully extracted and parsed JSON');
      } catch (extractError) {
        console.error('❌ Failed to extract JSON:', (extractError as any).message);
        structured = null;
      }
    }

    // Fallback structure if parsing failed
    if (!structured) {
      console.warn('⚠️ Building minimal fallback structure');
      const t1wc = (task1Answer?.trim() || '').split(/\s+/).length;
      const t2wc = (task2Answer?.trim() || '').split(/\s+/).length;
      structured = {
        task1: {
          criteria: generateCriteriaSchema('1'),
          feedback: {
            improvements: [],
            feedback_markdown: '### Task 1 Assessment\n\nAI response parsing issue. Raw response (partial):\n' + aiResponse.slice(0, 500)
          },
          word_count: t1wc
        },
        task2: {
          criteria: generateCriteriaSchema('2'),
          feedback: {
            improvements: [],
            feedback_markdown: '### Task 2 Assessment\n\nAI response parsing issue. Raw response (partial):\n' + aiResponse.slice(0, 500)
          },
          word_count: t2wc
        },
        overall: { band: 6.0, calculation: 'Fallback - parsing failed' }
      };
    }

    // Validate and enhance structure
    const ensureCriteria = (task: any, type: 'task1' | 'task2') => {
      const overall = typeof task?.overall_band === 'number' ? task.overall_band : 6.5;
      task.criteria = task.criteria || {};

      const criteria = [
        type === 'task1' ? 'task_achievement' : 'task_response',
        'coherence_and_cohesion',
        'lexical_resource',
        'grammatical_range_and_accuracy'
      ];

      for (const crit of criteria) {
        task.criteria[crit] = task.criteria[crit] || {
          band: overall,
          justification: 'Auto-filled from overall score.'
        };
      }
    };

    if (structured.task1) ensureCriteria(structured.task1, 'task1');
    if (structured.task2) ensureCriteria(structured.task2, 'task2');

    // Ensure feedback structures exist
    if (!structured.task1?.feedback) {
      structured.task1 = structured.task1 || {};
      structured.task1.feedback = { improvements: [], feedback_markdown: '## Task 1 Feedback\n\nNo improvements available.' };
    }

    if (!structured.task2?.feedback) {
      structured.task2 = structured.task2 || {};
      structured.task2.feedback = { improvements: [], feedback_markdown: '## Task 2 Feedback\n\nNo improvements available.' };
    }

    console.log('✅ Response structure validated and enhanced');

    return new Response(
      JSON.stringify({
        success: true,
        feedback: `# IELTS Writing Assessment Results\n\n**Overall Band Score: ${structured.overall?.band || 6.0}**`,
        structured,
        apiUsed: modelUsed,
        task1WordCount: (task1Answer?.trim() || '').split(/\s+/).length,
        task2WordCount: (task2Answer?.trim() || '').split(/\s+/).length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in ielts-writing-examiner function:', (error as any).message);
    return new Response(
      JSON.stringify({ success: false, error: (error as any).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});