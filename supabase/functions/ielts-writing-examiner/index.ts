import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callOpenAI(messages: any[], apiKey: string) {
  console.log('🚀 Attempting OpenAI API call...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Using legacy model that supports max_tokens and temperature
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API Error:', errorText);
    throw new Error(`OpenAI API failed: ${response.status} - ${errorText}`);
  }

  console.log('✅ OpenAI API call successful');
  return response.json();
}

async function callDeepSeek(messages: any[], apiKey: string) {
  console.log('🚀 Attempting DeepSeek API call...');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ DeepSeek API Error:', errorText);
    throw new Error(`DeepSeek API failed: ${response.status} - ${errorText}`);
  }

  console.log('✅ DeepSeek API call successful');
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    console.log('🔍 API Keys status:', {
      hasOpenAI: !!openAIApiKey,
      hasDeepSeek: !!deepSeekApiKey,
      openAILength: openAIApiKey?.length || 0,
      deepSeekLength: deepSeekApiKey?.length || 0,
    });
    
    if (!openAIApiKey && !deepSeekApiKey) {
      console.error('❌ No API keys found');
      throw new Error('No AI API keys configured');
    }

    const { task1Answer, task2Answer, task1Data, task2Data } = await req.json();

    if (!task1Answer || !task2Answer) {
      throw new Error('Both Task 1 and Task 2 answers are required');
    }

    console.log('🔍 AI Examiner Request:', { 
      task1Length: task1Answer.length,
      task2Length: task2Answer.length 
    });

    const examinerPrompt = `You are a senior IELTS Writing examiner.\n\nReturn ONLY a single JSON object (no extra prose). Use this exact schema:\n{\n  "task1": {\n    "criteria": {\n      "task_achievement": { "band": number, "justification": string },\n      "coherence_and_cohesion": { "band": number, "justification": string },\n      "lexical_resource": { "band": number, "justification": string },\n      "grammatical_range_and_accuracy": { "band": number, "justification": string }\n    },\n    "overall_band": number,\n    "overall_reason": string,\n    "feedback": {\n      "strengths": string[],\n      "improvements": string[]\n    },\n    "feedback_markdown": string\n  },\n  "task2": {\n    "criteria": {\n      "task_response": { "band": number, "justification": string },\n      "coherence_and_cohesion": { "band": number, "justification": string },\n      "lexical_resource": { "band": number, "justification": string },\n      "grammatical_range_and_accuracy": { "band": number, "justification": string }\n    },\n    "overall_band": number,\n    "overall_reason": string,\n    "feedback": {\n      "strengths": string[],\n      "improvements": string[]\n    },\n    "feedback_markdown": string\n  },\n  "overall": {\n    "band": number,\n    "calculation": string,\n    "feedback_markdown": string\n  },\n  "full_report_markdown": string\n}\n\nRules:\n- Bands must be whole or half only: 0, 0.5, 1.0, …, 9.0.\n- Avoid giving identical bands across all criteria unless explicitly justified with concrete textual evidence; prefer nuanced differentiation when warranted.\n- For each task, compute overall_band by averaging the four criteria and rounding to nearest 0.5 using IELTS rules (.25→.5, .75→next whole).\n- Compute overall.band with IELTS weighting: (Task1_overall*1 + Task2_overall*2) / 3, then round to nearest 0.5. Provide the exact calculation string in overall.calculation.\n- For each task, provide at least 3 concise "strengths" and 3 "improvements" bullets in the feedback object.\n- Keep feedback_markdown fields as clean, sectioned reports suitable for display. full_report_markdown should combine everything nicely for display.\n\nTASK 1 DETAILS:\nPrompt: ${task1Data?.title || 'Task 1'}\nInstructions: ${task1Data?.instructions || ''}\n${task1Data?.imageContext ? `Image Description: ${task1Data.imageContext}` : ''}\n${task1Data?.imageUrl ? `Visual Data Present: Yes` : 'Visual Data Present: No'}\n\nSTUDENT TASK 1 RESPONSE:\n"${task1Answer}"\n\nTASK 2 DETAILS:\nPrompt: ${task2Data?.title || 'Task 2'}\nInstructions: ${task2Data?.instructions || ''}\n\nSTUDENT TASK 2 RESPONSE:\n"${task2Answer}"\n`;



    const messages = [
      {
        role: 'system',
        content: `You are "Examiner-7," a senior, Cambridge-certified IELTS examiner. Your assessments must be decisive, accurate, and strictly based on the official band descriptors.

New Guiding Principle: Do not be overly cautious. If a response fully and expertly meets the criteria for a Band 9, you must award a Band 9. Do not invent minor flaws to justify a lower score.

New Feedback Requirement (CRITICAL): Your feedback must be extremely specific and actionable. For every "Area for Improvement" you identify, provide:
- issue: a short label of the problem
- sentence_quote: a direct quote from the student's own writing
- improved_version: a stronger, revised version of that exact sentence/fragment
- explanation: a brief rationale

Return ONLY a single JSON object using this exact schema:
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
    "feedback": {
      "strengths": string[],
      "improvements": string[]
    },
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
    "feedback": {
      "strengths": string[],
      "improvements": string[]
    },
    "feedback_markdown": string
  },
  "overall": {
    "band": number,
    "calculation": string,
    "feedback_markdown": string
  },
  "full_report_markdown": string
}

Scoring & Rules:
- Bands must be whole or half only: 0, 0.5, …, 9.0.
- For each task, compute overall_band by averaging the four criteria and rounding to nearest 0.5 using IELTS rules (.25→.5, .75→next whole).
- Compute overall.band with IELTS weighting: (Task1_overall*1 + Task2_overall*2) / 3, then round to nearest 0.5. Provide the exact calculation in overall.calculation.
- Provide at least 3 "strengths" and 3 "improvements" for each task.
- Be confident awarding Band 9 where fully deserved; do not downgrade for invented minor flaws.

Return ONLY JSON. Do not output any markdown or prose outside the JSON.`
      },
      {
        role: 'user',
        content: examinerPrompt
      }
    ];

    let data;
    let apiUsed = 'none';
    
    // Try OpenAI first if available
    if (openAIApiKey) {
      try {
        console.log('🔄 Trying OpenAI API...');
        data = await callOpenAI(messages, openAIApiKey);
        apiUsed = 'openai';
      } catch (openAIError) {
        console.warn('⚠️ OpenAI failed, trying DeepSeek fallback:', openAIError.message);
        if (deepSeekApiKey) {
          try {
            data = await callDeepSeek(messages, deepSeekApiKey);
            apiUsed = 'deepseek';
          } catch (deepSeekError) {
            console.error('❌ Both APIs failed');
            throw new Error(`Both APIs failed. OpenAI: ${openAIError.message}, DeepSeek: ${deepSeekError.message}`);
          }
        } else {
          throw new Error(`OpenAI failed and no DeepSeek fallback: ${openAIError.message}`);
        }
      }
    } else if (deepSeekApiKey) {
      console.log('🔄 Using DeepSeek API (OpenAI not available)...');
      try {
        data = await callDeepSeek(messages, deepSeekApiKey);
        apiUsed = 'deepseek';
      } catch (deepSeekError) {
        throw new Error(`DeepSeek API failed: ${deepSeekError.message}`);
      }
    }

    console.log(`✅ AI Examiner response generated using ${apiUsed.toUpperCase()}`);

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

    const clampBands = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const k in obj) {
        const v = (obj as any)[k];
        if (k === 'band' && typeof v === 'number') (obj as any)[k] = Math.min(9, Math.max(0, v));
        else if (typeof v === 'object') clampBands(v);
      }
    };
    if (structured) clampBands(structured);
    const feedback = structured?.full_report_markdown || content;

    return new Response(JSON.stringify({ 
      success: true, 
      feedback,
      structured,
      apiUsed,
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