import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { task1Answer, task2Answer, task1Data, task2Data } = await req.json();

    if (!task1Answer || !task2Answer) {
      throw new Error('Both Task 1 and Task 2 answers are required');
    }

    console.log('🔍 AI Examiner Request:', { 
      task1Length: task1Answer.length,
      task2Length: task2Answer.length 
    });

    const examinerPrompt = `You are a senior, highly experienced IELTS examiner. Your goal is to provide a holistic and accurate assessment based *only* on the official IELTS band descriptors and scoring rules provided below. Evaluate the student's response against these criteria and justify your feedback by referencing them.

Focus on overall communicative effectiveness. Do not just count errors; explain their impact on the band score for a specific criterion.

You will first provide a whole number band score (0-9) for each of the four criteria. Then, you will calculate the Overall Band Score according to the specific rounding rules provided at the end.

Now, please assess the following submission against the relevant band descriptors:

**TASK 1 DETAILS:**
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Image Description: ${task1Data.imageContext}` : ''}

**STUDENT'S TASK 1 RESPONSE:**
"${task1Answer}"

**TASK 2 DETAILS:**
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}

**STUDENT'S TASK 2 RESPONSE:**
"${task2Answer}"

[-- IELTS WRITING BAND DESCRIPTORS --]

Task Achievement / Response:

Band 9: Fully addresses all parts of the task with a fully developed response.
Band 8: Sufficiently covers all parts of the task.
Band 7: Covers all requirements of the task; presents a clear overview/purpose.
Band 6: Addresses all parts of the task, though some may be more fully covered than others.
Band 5: Addresses the task only partially.
Band 4: Responds to the task only in a minimal way.
Band 3: Does not address the task.
Band 2: Barely responds to the task.

Coherence and Cohesion:

Band 9: Skillful use of cohesion; seamless paragraphing.
Band 8: Manages all aspects of cohesion well.
Band 7: Logically organizes information; clear progression; uses a range of cohesive devices appropriately.
Band 6: Arranges information coherently; clear overall progression.
Band 5: Some organization, but lack of overall progression; inadequate or repetitive use of cohesive devices.
Band 4: Information is not logically organized.
Band 3: Does not organize ideas logically.
Band 2: Little control of organizational features.

Lexical Resource (Vocabulary):

Band 9: Wide range of vocabulary with natural and sophisticated control.
Band 8: Wide range of vocabulary; skillfully uses less common items.
Band 7: Sufficient range of vocabulary; uses some less common items.
Band 6: Adequate range of vocabulary for the task.
Band 5: Limited range of vocabulary; noticeable errors.
Band 4: Uses only basic vocabulary; frequent errors.
Band 3: Uses only a very limited range of words.
Band 2: Uses only isolated words.

Grammatical Range and Accuracy:

Band 9: Wide range of structures with full flexibility and accuracy.
Band 8: Wide range of structures; the majority of sentences are error-free.
Band 7: Uses a variety of complex structures; produces frequent error-free sentences.
Band 6: Uses a mix of simple and complex sentences; some errors in grammar.
Band 5: Uses only a limited range of structures; frequent grammatical errors.
Band 4: Uses only very basic sentence structures with frequent errors.
Band 3: Cannot use sentence forms.
Band 2: Cannot produce basic sentence forms.

**Final Score Calculation Rules (CRITICAL):**

After you have determined the individual band scores (whole numbers from 0-9) for each of the four criteria, you must calculate the Overall Band Score.

1. Calculate the average of the four criteria scores.
2. You must then apply the official IELTS rounding rules to this average:
   * If the average ends in .25, you must round it UP to the next half-band (e.g., an average of 6.25 becomes an Overall Score of 6.5).
   * If the average ends in .75, you must round it UP to the next whole band (e.g., an average of 6.75 becomes an Overall Score of 7.0).
   * For all other values, round to the nearest whole or half-band as normal.

Please provide a comprehensive assessment using this EXACT format:

## TASK 1 ASSESSMENT

### Task Achievement
**Band Score: [0-9]**
**Positive Feedback:**
• [List specific strengths based on band descriptors]

**Areas for Improvement:**
• [List specific areas with examples from band descriptors]

### Coherence and Cohesion  
**Band Score: [0-9]**
**Positive Feedback:**
• [List specific strengths based on band descriptors]

**Areas for Improvement:**
• [List specific areas with examples from band descriptors]

### Lexical Resource
**Band Score: [0-9]**
**Positive Feedback:**
• [List specific strengths based on band descriptors]

**Areas for Improvement:**
• [List specific areas with examples from band descriptors]

### Grammatical Range and Accuracy
**Band Score: [0-9]**
**Positive Feedback:**
• [List specific strengths based on band descriptors]

**Areas for Improvement:**
• [List specific areas with examples from band descriptors]

**Task 1 Overall Band Score: [Calculate using rounding rules]**

---

## TASK 2 ASSESSMENT

### Task Response
**Band Score: [0-9]**
**Positive Feedback:**
• [List specific strengths based on band descriptors]

**Areas for Improvement:**
• [List specific areas with examples from band descriptors]

### Coherence and Cohesion
**Band Score: [0-9]**
**Positive Feedback:**
• [List specific strengths based on band descriptors]

**Areas for Improvement:**
• [List specific areas with examples from band descriptors]

### Lexical Resource
**Band Score: [0-9]**
**Positive Feedback:**
• [List specific strengths based on band descriptors]

**Areas for Improvement:**
• [List specific areas with examples from band descriptors]

### Grammatical Range and Accuracy
**Band Score: [0-9]**
**Positive Feedback:**
• [List specific strengths based on band descriptors]

**Areas for Improvement:**
• [List specific areas with examples from band descriptors]

**Task 2 Overall Band Score: [Calculate using rounding rules]**

---

## OVERALL WRITING ASSESSMENT

--- **Final Overall Writing Score Calculation (CRITICAL - Weighted Average):**

After you have calculated the individual Overall Band Scores for Task 1 and Task 2, you must combine them to produce the final Overall Writing Band Score.

The calculation must follow the official IELTS weighting: **Task 2 is worth twice as much as Task 1.**

You must use the following formula: Overall Writing Score = ( (Task 1 Overall Score * 1) + (Task 2 Overall Score * 2) ) / 3

**Example Calculation:** If Task 1 Score = 7.0 and Task 2 Score = 8.0: The calculation is: ((7.0 * 1) + (8.0 * 2)) / 3 = (7.0 + 16.0) / 3 = 23 / 3 = 7.666...

After calculating this weighted average, you must then apply the final rounding rule: * The result (e.g., 7.666...) is rounded to the nearest whole or half band. * In the example above, 7.666... rounds to an Overall Writing Band Score of 7.5.

The final assessment must include the individual scores for Task 1 and Task 2, as well as this final, correctly weighted and rounded Overall Writing Band Score.
---

**Overall Writing Band Score: [Calculate using the weighted formula above]**

### Your Path to a Higher Score
[Provide 2-3 clear, actionable steps the student can take to improve, based on their performance. Be specific and practical.]

Be precise, professional, and constructive in your feedback. Focus on actionable advice that helps students improve their IELTS Writing performance.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a senior IELTS Writing examiner with comprehensive knowledge of official band descriptors. Follow the assessment criteria and scoring rules provided in the user prompt exactly. Use the official IELTS 0-9 band scale and apply the precise rounding rules for calculating the overall band score. Your assessment should be holistic, focusing on communicative effectiveness while strictly adhering to the official band descriptors.'
          },
          {
            role: 'user',
            content: examinerPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const feedback = data.choices[0].message.content;

    console.log('✅ AI Examiner Response generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      feedback: feedback,
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