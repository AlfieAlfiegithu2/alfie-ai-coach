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

    const examinerPrompt = `You are a senior IELTS Writing examiner.

Return ONLY a single JSON object (no extra prose). Use this exact schema:
{
  "task1": {
    "criteria": {
      "task_achievement": { "band": number, "justification": string },
      "coherence_and_cohesion": { "band": number, "justification": string },
      "lexical_resource": { "band": number, "justification": string },
      "grammatical_range_and_accuracy": { "band": number, "justification": string }
    },
    "overall_band": number,
    "overall_reason": string,
    "feedback_markdown": string
  },
  "task2": {
    "criteria": {
      "task_response": { "band": number, "justification": string },
      "coherence_and_cohesion": { "band": number, "justification": string },
      "lexical_resource": { "band": number, "justification": string },
      "grammatical_range_and_accuracy": { "band": number, "justification": string }
    },
    "overall_band": number,
    "overall_reason": string,
    "feedback_markdown": string
  },
  "overall": {
    "band": number,
    "calculation": string,
    "feedback_markdown": string
  },
  "full_report_markdown": string
}

Rules:
- Bands must be whole or half only: 0, 0.5, 1.0, …, 9.0.
- Avoid giving identical bands across all criteria unless explicitly justified; prefer nuanced differentiation when warranted by evidence.
- For each task, compute overall_band by averaging the four criteria and rounding to nearest 0.5 using IELTS rules (.25→.5, .75→next whole).
- Compute overall.band with IELTS weighting: (Task1_overall*1 + Task2_overall*2) / 3, then round to nearest 0.5. Provide the exact calculation string in overall.calculation.
- feedback_markdown fields must be clean, sectioned reports for each task and for the overall assessment. full_report_markdown should combine everything nicely for display.

TASK 1 DETAILS:
Prompt: ${task1Data?.title || 'Task 1'}
Instructions: ${task1Data?.instructions || ''}
${task1Data?.imageContext ? `Image Description: ${task1Data.imageContext}` : ''}
${task1Data?.imageUrl ? `Visual Data Present: Yes` : 'Visual Data Present: No'}

STUDENT TASK 1 RESPONSE:
"${task1Answer}"

TASK 2 DETAILS:
Prompt: ${task2Data?.title || 'Task 2'}
Instructions: ${task2Data?.instructions || ''}

STUDENT TASK 2 RESPONSE:
"${task2Answer}"
`;


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
            content: 'You are a senior IELTS Writing examiner. Return ONLY JSON as specified by the user prompt schema. Use official IELTS bands with half increments and apply rounding rules exactly. No markdown or prose outside JSON.'
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
    let content = data.choices?.[0]?.message?.content ?? '';

    let structured: any = null;
    try {
      structured = JSON.parse(content);
    } catch (_e) {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { structured = JSON.parse(match[0]); } catch (_e2) {}
      }
    }

    const feedback = structured?.full_report_markdown || content;

    console.log('✅ AI Examiner Response generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      feedback,
      structured,
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