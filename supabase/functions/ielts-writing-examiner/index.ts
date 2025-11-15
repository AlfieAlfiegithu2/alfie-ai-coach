import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// UNIFIED API CALLER - Consolidates all provider logic into one function
// ============================================================================
type Provider = 'kimi' | 'gemini' | 'deepseek' | 'openai';

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

    if (provider === 'kimi') {
      // Kimi K2 Thinking via OpenRouter
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      contentPath = ['choices', '0', 'message', 'content'];
    } else if (provider === 'gemini') {
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
  targetLanguage?: string,
  trainingType: 'Academic' | 'General' = 'Academic'
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

  // Generate Task 1 prompt based on training type
  const task1Prompt = trainingType === 'General'
    ? `TASK 1 - LETTER WRITING (General Training)

Letter Prompt: ${task1Data?.title || 'Task 1'}
Letter Type: ${task1Data?.letterType || 'Formal'}
Instructions: ${task1Data?.instructions || ''}
Word Count: ${task1WordCount}
Student Letter: "${task1Answer}"

You are evaluating a General Training IELTS Task 1 letter. This is DIFFERENT from Academic Task 1.

**IMPORTANT:** For General Training Task 1, use the OFFICIAL IELTS Band Descriptors below. The same four criteria apply, but Task Achievement for letters includes: addressing all requirements, using appropriate tone and register, and following letter format conventions.

**Official IELTS Band Descriptors for Task 1 (Updated May 2023):**

Task Achievement:
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

Coherence & Cohesion:
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

**CRITICAL:** Evaluate this as a LETTER, not a data description. Task Achievement must consider: (1) whether all requirements are addressed, (2) whether the tone and register are appropriate for the situation and relationship, and (3) whether the letter format is appropriate (salutation, closing, paragraphing).`
    : `TASK 1 - DATA DESCRIPTION (Academic)

Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Visual Data: ${task1Data.imageContext}` : ''}
Word Count: ${task1WordCount}
Student Response: "${task1Answer}"

You are evaluating an Academic IELTS Task 1 data description. Use the OFFICIAL IELTS Band Descriptors provided in the main prompt section. For Task Achievement, refer to the (Academic) specific points within each band descriptor.`;

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

Task Achievement (Task 1) - Updated May 2023:
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

Task Response (Task 2) - Applies to both Academic and General Training:
9: The prompt is appropriately addressed and explored in depth. A clear and fully developed position is presented which directly answers the question/s. Ideas are relevant, fully extended and well supported. Any lapses in content or support are extremely rare.

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

After analyzing Task 1 and Task 2, return a single valid JSON object with:
1. Band scores (0.0-9.0, in 0.5 increments) for each criterion
2. 2-3 sentence justifications quoting specific examples
3. 3-5 improvements per task addressing different aspects
4. Overall band calculation

${task1Prompt}

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
    
    // Determine training type from task1Data
    const trainingType = task1Data?.trainingType || 'Academic';

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
      targetLanguage,
      trainingType
    );

    // ========================================================================
    // OPTIMIZED API STRATEGY: Kimi K2 Thinking (Primary) → Fallbacks
    // ========================================================================
    let aiResponse: string;
    let modelUsed: string;
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const primaryProvider: Provider = apiProvider as Provider;

    // Primary: Kimi K2 Thinking via OpenRouter
    if (openRouterApiKey) {
      try {
        console.log('🔄 Using Kimi K2 Thinking (OpenRouter) as primary model...');
        aiResponse = await callLLM({ provider: 'kimi', apiKey: openRouterApiKey, prompt: masterExaminerPrompt });
        modelUsed = 'Kimi K2 Thinking (OpenRouter)';
        console.log('✅ Kimi K2 Thinking succeeded');
      } catch (kimiError) {
        console.log('⚠️ Kimi K2 Thinking failed, falling back to secondary models:', (kimiError as any).message);
        
        // Fallback: Use requested provider or default to Gemini
        const fallbackProvider = (primaryProvider === 'openai' || primaryProvider === 'gemini' || primaryProvider === 'deepseek') 
          ? primaryProvider 
          : 'gemini';
        
        try {
          if (fallbackProvider === 'openai' && Deno.env.get('OPENAI_API_KEY')) {
            console.log(`🔄 Fallback: Using OpenAI API...`);
            aiResponse = await callLLM({ provider: 'openai', apiKey: Deno.env.get('OPENAI_API_KEY')!, prompt: masterExaminerPrompt });
            modelUsed = `OpenAI (Fallback)`;
            console.log('✅ OpenAI fallback succeeded');
          } else if (fallbackProvider === 'gemini' && Deno.env.get('GEMINI_API_KEY')) {
            console.log(`🔄 Fallback: Using Gemini API...`);
            aiResponse = await callLLM({ provider: 'gemini', apiKey: Deno.env.get('GEMINI_API_KEY')!, prompt: masterExaminerPrompt });
            modelUsed = 'Gemini (Fallback)';
            console.log('✅ Gemini fallback succeeded');
          } else {
            throw new Error('No fallback API keys available');
          }
        } catch (fallbackError) {
          // Final fallback: DeepSeek
          const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
          if (deepseekKey) {
            console.log('🔄 Final Fallback: Using DeepSeek API...');
            aiResponse = await callLLM({ provider: 'deepseek', apiKey: deepseekKey, prompt: masterExaminerPrompt });
            modelUsed = 'DeepSeek (Final Fallback)';
            console.log('✅ DeepSeek final fallback succeeded');
          } else {
            throw new Error('All models failed and no DEEPSEEK_API_KEY available for final fallback');
          }
        }
      }
    } else {
      // No OpenRouter key, use legacy flow
      console.warn('⚠️ No OpenRouter API key found, using legacy provider flow');
      
      if (primaryProvider === 'openai' && !Deno.env.get('OPENAI_API_KEY')) {
        throw new Error('OpenAI API key is required for selected provider');
      }

      if (primaryProvider === 'gemini' && !Deno.env.get('GEMINI_API_KEY')) {
        throw new Error('Gemini API key is required');
      }

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
    }

    console.log('🔍 Raw API response content length:', aiResponse.length);

    if (!aiResponse || aiResponse.length < 10) {
      throw new Error('API returned empty or invalid response');
    }
    
    // Optimized logging: only log in development or truncate
    const isDevelopment = Deno.env.get('ENV') === 'development' || Deno.env.get('DENO_ENV') === 'development';
    if (isDevelopment) {
      console.log('🔍 Raw API response preview:', aiResponse.substring(0, 500) + '...');
    } else {
      console.log('🔍 Raw API response preview:', aiResponse.substring(0, 100) + '...');
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

    // Validate and enhance structure - Improved: Only auto-fill if 1-2 criteria missing
    const ensureCriteria = (task: any, type: 'task1' | 'task2') => {
      const overall = typeof task?.overall_band === 'number' ? task.overall_band : 6.5;
      task.criteria = task.criteria || {};

      const criteria = [
        type === 'task1' ? 'task_achievement' : 'task_response',
        'coherence_and_cohesion',
        'lexical_resource',
        'grammatical_range_and_accuracy'
      ];

      // Count missing criteria
      const missingCount = criteria.filter(crit => !task.criteria[crit] || typeof task.criteria[crit]?.band !== 'number').length;
      
      // Only auto-fill if 1-2 missing (not 3-4)
      if (missingCount > 2) {
        console.warn(`⚠️ Too many missing criteria (${missingCount}/4) for ${type}. Marking as incomplete.`);
        task.analysis_incomplete = true;
        task.incomplete_reason = `${missingCount} out of 4 criteria were not provided by the AI analysis.`;
      }

      // Auto-fill only missing ones (if <= 2 missing)
      for (const crit of criteria) {
        if (!task.criteria[crit] && missingCount <= 2) {
          task.criteria[crit] = {
            band: overall,
            justification: 'Auto-filled from overall score (original analysis incomplete).'
          };
        }
      }
    };

    if (structured.task1) ensureCriteria(structured.task1, 'task1');
    if (structured.task2) ensureCriteria(structured.task2, 'task2');

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

    // Ensure feedback structures exist
    if (!structured.task1?.feedback) {
      structured.task1 = structured.task1 || {};
      structured.task1.feedback = { improvements: [], feedback_markdown: '## Task 1 Feedback\n\nNo improvements available.' };
    } else if (structured.task1.feedback.improvements) {
      structured.task1.feedback.improvements = validateImprovements(structured.task1.feedback.improvements, 'task1');
    }

    if (!structured.task2?.feedback) {
      structured.task2 = structured.task2 || {};
      structured.task2.feedback = { improvements: [], feedback_markdown: '## Task 2 Feedback\n\nNo improvements available.' };
    } else if (structured.task2.feedback.improvements) {
      structured.task2.feedback.improvements = validateImprovements(structured.task2.feedback.improvements, 'task2');
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