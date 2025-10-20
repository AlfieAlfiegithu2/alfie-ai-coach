import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
          temperature: 0.1,
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

async function callOpenAI(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting OpenAI API call (attempt ${retryCount + 1}/2)...`);
  
  try {
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
      return callOpenAI(prompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

async function callDeepSeek(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting DeepSeek API call (attempt ${retryCount + 1}/2)...`);
  try {
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
      return callDeepSeek(prompt, apiKey, retryCount + 1);
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task1Answer, task2Answer, task1Data, task2Data, apiProvider = 'gemini', targetLanguage } = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
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
      task1Length: task1Answer.length,
      task2Length: task2Answer.length,
      targetLanguage: targetLanguage || 'en'
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

After analyzing the provided Task 1 and Task 2 essays, you must return a single, valid JSON object.

Score Each Criterion: For both Task 1 and Task 2, provide a band score (from 0.0 to 9.0, in 0.5 increments) for each of the four criteria based on the descriptors above.

Write Justifications: For each score, you must write a 2-3 sentence justification, quoting specific examples from the student's writing as evidence.

Handle Word Count: You must check if the essays are under the word count (150 for Task 1, 250 for Task 2). If an essay is significantly under length, you must state that this will lower the Task Achievement/Response score and reflect this in your scoring.

Provide Overall Feedback: Based on your analysis, provide a bulleted list of 2-3 "Key Strengths" and 2-3 "Specific, Actionable Improvements."

CRITICAL: Identify and Detail Multiple Areas for Improvement

After you have completed the band score assessment, you must generate comprehensive feedback for each task.

For EACH task (Task 1 and Task 2), you must analyze the submission and identify at least 3 to 5 distinct areas for improvement. Each area of improvement you identify must create a separate object in the improvements array.

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

Task 1:
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Visual Data: ${task1Data.imageContext}` : ''}
Student Response: "${task1Answer}"

Task 2:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}
Student Response: "${task2Answer}"

JSON SCHEMA:
{
  "task1": {
    "criteria": {
      "task_achievement": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "coherence_and_cohesion": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "lexical_resource": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "grammatical_range_and_accuracy": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
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
    "overall_band": 6.5,
    "word_count": ${task1Answer.trim().split(/\s+/).length}
  },
  "task2": {
    "criteria": {
      "task_response": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "coherence_and_cohesion": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "lexical_resource": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
      },
      "grammatical_range_and_accuracy": { 
        "band": 6.5, 
        "justification": "Quote specific examples and reference band descriptors. Must be 2-3 sentences minimum." 
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
    "overall_band": 6.5,
    "word_count": ${task2Answer.trim().split(/\s+/).length}
  },
  "overall": {
    "band": 6.5,
    "calculation": "Calculation explanation"
  },
  "key_strengths": [
    "List 2-3 specific strengths from both tasks"
  ]
}`;

    // Use selected API provider with fallback
    let aiResponse: any;
    let modelUsed: string;
    let content: string;

    if (apiProvider === 'openai') {
      console.log('🔄 Using OpenAI API...');
      aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey);
      modelUsed = `OpenAI ${Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'}`;
      content = aiResponse.choices?.[0]?.message?.content ?? '';
      console.log('✅ OpenAI API succeeded');
    } else {
      try {
        console.log('🔄 Using Gemini API...');
        aiResponse = await callGemini(masterExaminerPrompt, geminiApiKey);
        modelUsed = 'Google Gemini AI';
        content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        console.log('✅ Gemini API succeeded');
      } catch (geminiError) {
        console.log('⚠️ Gemini failed, falling back to DeepSeek:', (geminiError as any).message);
        const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
        if (!deepseekKey) {
          throw new Error('Gemini failed and no DEEPSEEK_API_KEY available for fallback');
        }
        console.log('🔄 Fallback: Using DeepSeek API...');
        aiResponse = await callDeepSeek(masterExaminerPrompt, deepseekKey);
        modelUsed = `DeepSeek ${(Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-reasoner')} (Fallback)`;
        content = aiResponse.choices?.[0]?.message?.content ?? '';
        console.log('✅ DeepSeek fallback succeeded');
      }
    }

    console.log('🔍 Raw API response content length:', content.length);
    
    if (!content || content.length < 10) {
      console.error('❌ API response content is empty or too short:', content);
      throw new Error('API returned empty or invalid response');
    }
    
    console.log('🔍 Raw API response first 500 chars:', content.substring(0, 500));
    console.log('🔍 Raw API response last 500 chars:', content.substring(content.length - 500));

    let structured: any = null;
    try {
      structured = JSON.parse(content);
      console.log('✅ Successfully parsed structured response');
    } catch (_e) {
      console.log('⚠️ Failed to parse JSON directly, attempting extraction...');
      
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
        
        console.log('🔍 Extracted JSON length:', extractedJson.length);
        console.log('🔍 Extracted JSON first 200 chars:', extractedJson.substring(0, 200));
        console.log('🔍 Extracted JSON last 200 chars:', extractedJson.substring(extractedJson.length - 200));
        
        try {
          structured = JSON.parse(extractedJson);
          console.log('✅ Successfully parsed extracted JSON');
        } catch (parseError) {
          console.log('❌ Failed to parse extracted JSON:', parseError.message);
          
          // Try to fix common JSON issues
          try {
            let fixedJson = extractedJson.replace(/,(\s*[}\]])/g, '$1');
            
            // Balance braces if needed
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            
            if (openBraces > closeBraces) {
              fixedJson += '}'.repeat(openBraces - closeBraces);
            }
            
            console.log('🔧 Attempting to parse fixed JSON...');
            structured = JSON.parse(fixedJson);
            console.log('✅ Successfully parsed fixed JSON');
          } catch (fixError) {
            console.log('❌ Final parsing attempt failed:', fixError.message);
          }
        }
      }
    }

    // AI handles all scoring and word count considerations internally

    // If parsing failed entirely, build a minimal, safe fallback so the UI never breaks
    if (!structured) {
      console.warn('⚠️ No structured JSON parsed; building minimal fallback structure');
      structured = {
        task1: {
          criteria: {},
          feedback: {
            improvements: [],
            feedback_markdown: '### Task 1 Assessment\n\nThe AI response could not be parsed into structured JSON.\n\nRaw summary (truncated):\n' + (content || '').slice(0, 800)
          },
          word_count: task1Answer.trim().split(/\s+/).length
        },
        task2: {
          criteria: {},
          feedback: {
            improvements: [],
            feedback_markdown: '### Task 2 Assessment\n\nThe AI response could not be parsed into structured JSON.\n\nRaw summary (truncated):\n' + (content || '').slice(0, 800)
          },
          word_count: task2Answer.trim().split(/\s+/).length
        },
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
      const ensureCriteria = (task: any, type: 'task1' | 'task2') => {
        const overall = typeof task?.overall_band === 'number' ? task.overall_band : (typeof structured?.overall?.band === 'number' ? structured.overall.band : 6.5);
        task.criteria = task.criteria || {};
        if (type === 'task1') {
          task.criteria.task_achievement = task.criteria.task_achievement || { band: overall, justification: 'Auto-filled from overall score.' };
        } else {
          task.criteria.task_response = task.criteria.task_response || { band: overall, justification: 'Auto-filled from overall score.' };
        }
        task.criteria.coherence_and_cohesion = task.criteria.coherence_and_cohesion || { band: overall, justification: 'Auto-filled from overall score.' };
        task.criteria.lexical_resource = task.criteria.lexical_resource || { band: overall, justification: 'Auto-filled from overall score.' };
        task.criteria.grammatical_range_and_accuracy = task.criteria.grammatical_range_and_accuracy || { band: overall, justification: 'Auto-filled from overall score.' };
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
        const allEqualOverall = bands.every((b) => typeof b === 'number' && b === overall);
        const autoFilled = justs.every((j) => typeof j === 'string' && j.includes('Auto-filled'));
        return incomplete || allEqualOverall || autoFilled;
      };

      const maybeRescore = async () => {
        const overall = typeof structured?.overall?.band === 'number' ? structured.overall.band : 6.5;
        const needsTask1 = bandsMissingOrAutoFilled(structured.task1, 'task1', overall);
        const needsTask2 = bandsMissingOrAutoFilled(structured.task2, 'task2', overall);
        if (!needsTask1 && !needsTask2) return;

        const scoringPrompt = `Return ONLY JSON with numeric bands (.0 or .5). No explanations.\nSchema:\n{\n  "task1": {"task_achievement": 0.0, "coherence_and_cohesion": 0.0, "lexical_resource": 0.0, "grammatical_range_and_accuracy": 0.0},\n  "task2": {"task_response": 0.0, "coherence_and_cohesion": 0.0, "lexical_resource": 0.0, "grammatical_range_and_accuracy": 0.0}\n}\nRules: Use official IELTS descriptors.\nTask 1: ${task1Answer}\nTask 2: ${task2Answer}`;

        const tryRescore = async (): Promise<any | null> => {
          try {
            if (geminiApiKey) {
              const scoreResp = await callGemini(scoringPrompt, geminiApiKey);
              const scoreText = scoreResp.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
              return JSON.parse((scoreText.match(/\{[\s\S]*\}/) || [scoreText])[0]);
            }
          } catch (e) {
            console.log('⚠️ Rescore via Gemini failed:', (e as any)?.message);
          }
          try {
            const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
            if (deepseekKey) {
              const ds = await callDeepSeek(scoringPrompt, deepseekKey);
              const text = ds.choices?.[0]?.message?.content ?? '';
              return JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]);
            }
          } catch (e2) {
            console.log('⚠️ Rescore via DeepSeek failed:', (e2 as any)?.message);
          }
          try {
            if (openaiApiKey) {
              const oa = await callOpenAI(`You must return ONLY JSON in the schema above. ${scoringPrompt}`, openaiApiKey);
              const text = oa.choices?.[0]?.message?.content ?? '';
              return JSON.parse((text.match(/\{[\s\S]*\}/) || [text])[0]);
            }
          } catch (e3) {
            console.log('❌ Rescore via OpenAI failed:', (e3 as any)?.message);
          }
          return null;
        };

        const parsed = await tryRescore();
        if (parsed) {
          if (needsTask1 && parsed?.task1) {
            structured.task1.criteria.task_achievement.band = parsed.task1.task_achievement ?? structured.task1.criteria.task_achievement.band;
            structured.task1.criteria.coherence_and_cohesion.band = parsed.task1.coherence_and_cohesion ?? structured.task1.criteria.coherence_and_cohesion.band;
            structured.task1.criteria.lexical_resource.band = parsed.task1.lexical_resource ?? structured.task1.criteria.lexical_resource.band;
            structured.task1.criteria.grammatical_range_and_accuracy.band = parsed.task1.grammatical_range_and_accuracy ?? structured.task1.criteria.grammatical_range_and_accuracy.band;
            structured.task1.criteria.task_achievement.justification = structured.task1.criteria.task_achievement.justification || 'Rescored numerically.';
            structured.task1.criteria.coherence_and_cohesion.justification = structured.task1.criteria.coherence_and_cohesion.justification || 'Rescored numerically.';
            structured.task1.criteria.lexical_resource.justification = structured.task1.criteria.lexical_resource.justification || 'Rescored numerically.';
            structured.task1.criteria.grammatical_range_and_accuracy.justification = structured.task1.criteria.grammatical_range_and_accuracy.justification || 'Rescored numerically.';
          }
          if (needsTask2 && parsed?.task2) {
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
          const t1 = getTaskBands(structured.task1, 'task1').filter((b) => typeof b === 'number') as number[];
          const t2 = getTaskBands(structured.task2, 'task2').filter((b) => typeof b === 'number') as number[];
          if (t1.length === 4) {
            structured.task1.overall_band = roundIELTS((t1[0] + t1[1] + t1[2] + t1[3]) / 4);
          }
          if (t2.length === 4) {
            structured.task2.overall_band = roundIELTS((t2[0] + t2[1] + t2[2] + t2[3]) / 4);
          }
          if (typeof structured.task1?.overall_band === 'number' && typeof structured.task2?.overall_band === 'number') {
            const overallWeighted = roundIELTS((structured.task1.overall_band + 2 * structured.task2.overall_band) / 3);
            structured.overall = structured.overall || {};
            structured.overall.band = overallWeighted;
            structured.overall.calculation = 'Weighted average (Task 1 x1, Task 2 x2)';
          }
        }
      };

      await maybeRescore();

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
      
      // Migrate legacy specific_improvements to task-specific feedback if needed
      if (structured.specific_improvements && Array.isArray(structured.specific_improvements)) {
        console.log('🔄 Migrating legacy specific_improvements to task-specific format...');
        
        // Split improvements between tasks based on content analysis
        const task1Improvements = [];
        const task2Improvements = [];
        
        structured.specific_improvements.forEach((improvement) => {
          // Simple heuristic: if original text appears in task1Answer, assign to task1, otherwise task2
          if (task1Answer.includes(improvement.original?.substring(0, 50) || '')) {
            task1Improvements.push(improvement);
          } else {
            task2Improvements.push(improvement);
          }
        });
        
        if (task1Improvements.length > 0) {
          structured.task1.feedback.improvements = task1Improvements;
        }
        if (task2Improvements.length > 0) {
          structured.task2.feedback.improvements = task2Improvements;
        }
        
        // Remove legacy field
        delete structured.specific_improvements;
      }
      
      console.log('✅ Response structure validated and enhanced');
    }

    const feedback = structured ? 
      `# IELTS Writing Assessment Results\n\n**Overall Band Score: ${structured.overall?.band || 6.0}**\n\n${JSON.stringify(structured, null, 2)}` : 
      content;

    return new Response(JSON.stringify({ 
      success: true, 
      feedback,
      structured,
      apiUsed: modelUsed,
      task1WordCount: task1Answer.trim().split(/\s+/).length,
      task2WordCount: task2Answer.trim().split(/\s+/).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in ielts-writing-examiner function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});