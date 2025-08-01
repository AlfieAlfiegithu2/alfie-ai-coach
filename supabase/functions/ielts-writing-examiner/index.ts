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

    const examinerPrompt = `You are an experienced, senior IELTS examiner with over 10 years of experience. You are not a robot. You understand that great writing is more than just a checklist of grammatical points. Your goal is to provide feedback that is holistic, insightful, and focused on helping the student become a more effective communicator.

When you assess the essay, you must look beyond surface-level features. Consider the clarity of the argument, the development of ideas, the persuasive force of the examples, and the overall impression the writing leaves on you as an expert reader. Your feedback should reflect this holistic understanding.

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

CRITICAL: First and foremost, assess whether the student fully and precisely answered the specific questions asked above. This is paramount to the evaluation.

Please provide a comprehensive assessment using this EXACT format:

## TASK 1 ASSESSMENT

### Task Achievement
**Band Score: [4-9]**
**Positive Feedback:**
• [List specific strengths]

**Areas for Improvement:**
• [List specific areas with examples]

### Coherence and Cohesion  
**Band Score: [4-9]**
**Positive Feedback:**
• [List specific strengths]

**Areas for Improvement:**
• [List specific areas with examples]

### Lexical Resource
**Band Score: [4-9]**
**Positive Feedback:**
• [List specific strengths]

**Areas for Improvement:**
• [List specific areas with examples]

### Grammatical Range and Accuracy
**Band Score: [4-9]**
**Positive Feedback:**
• [List specific strengths]

**Areas for Improvement:**
• [List specific areas with examples]

**Task 1 Overall Band Score: [4-9]**

---

## TASK 2 ASSESSMENT

### Task Response
**Band Score: [4-9]**
**Positive Feedback:**
• [List specific strengths]

**Areas for Improvement:**
• [List specific areas with examples]

### Coherence and Cohesion
**Band Score: [4-9]**
**Positive Feedback:**
• [List specific strengths]

**Areas for Improvement:**
• [List specific areas with examples]

### Lexical Resource
**Band Score: [4-9]**
**Positive Feedback:**
• [List specific strengths]

**Areas for Improvement:**
• [List specific areas with examples]

### Grammatical Range and Accuracy
**Band Score: [4-9]**
**Positive Feedback:**
• [List specific strengths]

**Areas for Improvement:**
• [List specific areas with examples]

**Task 2 Overall Band Score: [4-9]**

---

## OVERALL WRITING ASSESSMENT

**Overall Writing Band Score: [4-9]**

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
            content: 'You are a senior IELTS Writing examiner who values effective communication over mechanical correctness. Your assessment should be holistic, focusing on how well the student communicates their ideas rather than simply counting errors. For Task Achievement/Response, prioritize whether they answered the specific question fully and effectively. For Coherence, focus on logical flow and clarity. For Lexical Resource, reward natural and precise word choice over "fancy" vocabulary. For Grammar, assess flexibility and communication effectiveness, not just accuracy. Your feedback should feel human and encouraging while maintaining professional standards.'
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