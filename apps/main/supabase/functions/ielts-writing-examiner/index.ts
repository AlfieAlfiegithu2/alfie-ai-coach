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

async function callKimiK2Thinking(prompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting Kimi K2 Thinking API call via OpenRouter (attempt ${retryCount + 1}/2)...`);
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
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Kimi K2 Thinking API Error:', errorText);
      throw new Error(`Kimi K2 Thinking API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Kimi K2 Thinking API call successful`);
    
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
  } catch (error) {
    console.error(`❌ Kimi K2 Thinking attempt ${retryCount + 1} failed:`, (error as any).message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying Kimi K2 Thinking API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callKimiK2Thinking(prompt, apiKey, retryCount + 1);
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

    // Determine training type from task1Data
    const trainingType = task1Data?.trainingType || 'Academic';

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Kimi K2 Thinking is now the primary model via OpenRouter
    if (!openRouterApiKey) {
      console.warn('⚠️ No OpenRouter API key found, will fallback to Gemini/OpenAI');
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

    // Use Kimi K2 Thinking as primary, with fallbacks
    let aiResponse: any;
    let modelUsed: string;
    let content: string;

    // Primary: Kimi K2 Thinking via OpenRouter
    if (openRouterApiKey) {
      try {
        console.log('🔄 Using Kimi K2 Thinking (OpenRouter) as primary model...');
        aiResponse = await callKimiK2Thinking(masterExaminerPrompt, openRouterApiKey);
        modelUsed = 'Kimi K2 Thinking (OpenRouter)';
        content = aiResponse.choices?.[0]?.message?.content ?? '';
        console.log('✅ Kimi K2 Thinking succeeded');
      } catch (kimiError) {
        console.log('⚠️ Kimi K2 Thinking failed, falling back to secondary models:', (kimiError as any).message);
        
        // Fallback 1: Use requested provider or Gemini
        if (apiProvider === 'openai' && openaiApiKey) {
          try {
            console.log('🔄 Fallback 1: Using OpenAI API...');
            aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey);
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
            aiResponse = await callGemini(masterExaminerPrompt, geminiApiKey);
            modelUsed = 'Google Gemini AI (Fallback)';
            content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            console.log('✅ Gemini fallback succeeded');
          } catch (geminiError) {
            console.log('⚠️ Gemini fallback failed, trying DeepSeek:', (geminiError as any).message);
            // Final fallback: DeepSeek
            const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
            if (deepseekKey) {
              console.log('🔄 Final Fallback: Using DeepSeek API...');
              aiResponse = await callDeepSeek(masterExaminerPrompt, deepseekKey);
              modelUsed = `DeepSeek ${(Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-reasoner')} (Final Fallback)`;
              content = aiResponse.choices?.[0]?.message?.content ?? '';
              console.log('✅ DeepSeek final fallback succeeded');
            } else {
              throw new Error('All models failed and no DEEPSEEK_API_KEY available for final fallback');
            }
          }
        } else {
          throw new Error('Kimi K2 Thinking failed and no fallback API keys available');
        }
      }
    } else {
      // No OpenRouter key, use legacy flow
      if (apiProvider === 'openai') {
        console.log('🔄 Using OpenAI API (no OpenRouter key)...');
        aiResponse = await callOpenAI(masterExaminerPrompt, openaiApiKey);
        modelUsed = `OpenAI ${Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'}`;
        content = aiResponse.choices?.[0]?.message?.content ?? '';
        console.log('✅ OpenAI API succeeded');
      } else {
        try {
          console.log('🔄 Using Gemini API (no OpenRouter key)...');
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
    }

    console.log('🔍 Raw API response content length:', content.length);
    
    if (!content || content.length < 10) {
      console.error('❌ API response content is empty or too short:', content);
      throw new Error('API returned empty or invalid response');
    }
    
    // Optimized logging: only log in development or truncate
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
      // Improved: Only auto-fill if 1-2 criteria missing, not all 4
      const ensureCriteria = (task: any, type: 'task1' | 'task2') => {
        const overall = typeof task?.overall_band === 'number' ? task.overall_band : (typeof structured?.overall?.band === 'number' ? structured.overall.band : 6.5);
        task.criteria = task.criteria || {};
        
        // Count how many criteria are missing
        const criteriaNames = type === 'task1' 
          ? ['task_achievement', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy']
          : ['task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy'];
        
        const missingCount = criteriaNames.filter(name => !task.criteria[name] || typeof task.criteria[name]?.band !== 'number').length;
        
        // Only auto-fill if 1-2 criteria missing (not 3-4)
        if (missingCount > 2) {
          console.warn(`⚠️ Too many missing criteria (${missingCount}/4) for ${type}. Marking as incomplete.`);
          task.analysis_incomplete = true;
          task.incomplete_reason = `${missingCount} out of 4 criteria were not provided by the AI analysis.`;
        }
        
        // Auto-fill only missing ones (if <= 2 missing)
        if (type === 'task1') {
          if (!task.criteria.task_achievement && missingCount <= 2) {
            task.criteria.task_achievement = { band: overall, justification: 'Auto-filled from overall score (original analysis incomplete).' };
          }
        } else {
          if (!task.criteria.task_response && missingCount <= 2) {
            task.criteria.task_response = { band: overall, justification: 'Auto-filled from overall score (original analysis incomplete).' };
          }
        }
        
        if (!task.criteria.coherence_and_cohesion && missingCount <= 2) {
          task.criteria.coherence_and_cohesion = { band: overall, justification: 'Auto-filled from overall score (original analysis incomplete).' };
        }
        if (!task.criteria.lexical_resource && missingCount <= 2) {
          task.criteria.lexical_resource = { band: overall, justification: 'Auto-filled from overall score (original analysis incomplete).' };
        }
        if (!task.criteria.grammatical_range_and_accuracy && missingCount <= 2) {
          task.criteria.grammatical_range_and_accuracy = { band: overall, justification: 'Auto-filled from overall score (original analysis incomplete).' };
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
          // Allow 0.5-1.0 band difference (e.g., justification says "band 7" but score is 6.5 is OK)
          if (levelDiff > 1.0) {
            console.warn(`⚠️ Score-justification mismatch for ${criterionName}: score=${band}, justification mentions ~${mentionedLevel.level}`);
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
        const needsTask1 = bandsMissingOrAutoFilled(structured.task1, 'task1', overall);
        const needsTask2 = bandsMissingOrAutoFilled(structured.task2, 'task2', overall);
        
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
  "task1": {
    "task_achievement": 0.0,
    "coherence_and_cohesion": 0.0,
    "lexical_resource": 0.0,
    "grammatical_range_and_accuracy": 0.0
  },
  "task2": {
    "task_response": 0.0,
    "coherence_and_cohesion": 0.0,
    "lexical_resource": 0.0,
    "grammatical_range_and_accuracy": 0.0
  }
}

Task 1:
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
Student Response: "${task1Answer}"
Word Count: ${task1Answer.trim().split(/\s+/).length}

Task 2:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}
Student Response: "${task2Answer}"
Word Count: ${task2Answer.trim().split(/\s+/).length}

Use official IELTS band descriptors. Be strict and accurate. Return ONLY the JSON object, no additional text.`;

        // Parallel rescoring - try all providers simultaneously
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
          
          const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
          if (deepseekKey) {
            promises.push(
              callDeepSeek(scoringPrompt, deepseekKey)
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
              callOpenAI(`You must return ONLY JSON in the schema above. ${scoringPrompt}`, openaiApiKey)
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
          structured.task1.feedback.improvements = validateImprovements(task1Improvements, 'task1');
        }
        if (task2Improvements.length > 0) {
          structured.task2.feedback.improvements = validateImprovements(task2Improvements, 'task2');
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