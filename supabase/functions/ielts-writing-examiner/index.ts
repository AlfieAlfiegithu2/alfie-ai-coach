import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Enhanced debugging
    console.log('🔍 Environment check:', {
      hasOpenAIKey: !!openAIApiKey,
      keyLength: openAIApiKey?.length || 0,
      availableEnvVars: Object.keys(Deno.env.toObject()).filter(key => 
        key.includes('OPENAI') || key.includes('API') || key.includes('KEY')
      )
    });
    
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not found in environment');
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

    const examinerPrompt = `You are a senior IELTS Writing examiner.\n\nReturn ONLY a single JSON object (no extra prose). Use this exact schema:\n{\n  "task1": {\n    "criteria": {\n      "task_achievement": { "band": number, "justification": string },\n      "coherence_and_cohesion": { "band": number, "justification": string },\n      "lexical_resource": { "band": number, "justification": string },\n      "grammatical_range_and_accuracy": { "band": number, "justification": string }\n    },\n    "overall_band": number,\n    "overall_reason": string,\n    "feedback": {\n      "strengths": string[],\n      "improvements": string[]\n    },\n    "feedback_markdown": string\n  },\n  "task2": {\n    "criteria": {\n      "task_response": { "band": number, "justification": string },\n      "coherence_and_cohesion": { "band": number, "justification": string },\n      "lexical_resource": { "band": number, "justification": string },\n      "grammatical_range_and_accuracy": { "band": number, "justification": string }\n    },\n    "overall_band": number,\n    "overall_reason": string,\n    "feedback": {\n      "strengths": string[],\n      "improvements": string[]\n    },\n    "feedback_markdown": string\n  },\n  "overall": {\n    "band": number,\n    "calculation": string,\n    "feedback_markdown": string\n  },\n  "full_report_markdown": string\n}\n\nRules:\n- Bands must be whole or half only: 0, 0.5, 1.0, …, 9.0.\n- Avoid giving identical bands across all criteria unless explicitly justified with concrete textual evidence; prefer nuanced differentiation when warranted.\n- For each task, compute overall_band by averaging the four criteria and rounding to nearest 0.5 using IELTS rules (.25→.5, .75→next whole).\n- Compute overall.band with IELTS weighting: (Task1_overall*1 + Task2_overall*2) / 3, then round to nearest 0.5. Provide the exact calculation string in overall.calculation.\n- For each task, provide at least 3 concise "strengths" and 3 "improvements" bullets in the feedback object.\n- Keep feedback_markdown fields as clean, sectioned reports suitable for display. full_report_markdown should combine everything nicely for display.\n\nTASK 1 DETAILS:\nPrompt: ${task1Data?.title || 'Task 1'}\nInstructions: ${task1Data?.instructions || ''}\n${task1Data?.imageContext ? `Image Description: ${task1Data.imageContext}` : ''}\n${task1Data?.imageUrl ? `Visual Data Present: Yes` : 'Visual Data Present: No'}\n\nSTUDENT TASK 1 RESPONSE:\n"${task1Answer}"\n\nTASK 2 DETAILS:\nPrompt: ${task2Data?.title || 'Task 2'}\nInstructions: ${task2Data?.instructions || ''}\n\nSTUDENT TASK 2 RESPONSE:\n"${task2Answer}"\n`;



    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are "Examiner-7," a senior, Cambridge-certified IELTS examiner. Your assessments must be decisive, accurate, and strictly based on the official band descriptors.

New Guiding Principle: Do not be overly cautious. If a response fully and expertly meets the criteria for a Band 9, you must award a Band 9. Do not invent minor flaws to justify a lower score.

New Feedback Requirement (CRITICAL): Your feedback must be extremely specific and actionable. For every "Area for Improvement" you identify, provide:
- issue: a short label of the problem
- sentence_quote: a direct quote from the student's own writing
- improved_version: a stronger, revised version of that exact sentence/fragment
- explanation: a brief rationale

Example:
In your sentence, "Technology is a valuable tool that provides significant benefits to people," the word "people" is general. Better: "Technology is a valuable tool that provides significant benefits to modern society."

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
      "improvements": string[],
      "improvements_detailed": [
        { "issue": string, "sentence_quote": string, "improved_version": string, "explanation": string }
      ]
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
      "improvements": string[],
      "improvements_detailed": [
        { "issue": string, "sentence_quote": string, "improved_version": string, "explanation": string }
      ]
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
- Provide at least 3 "strengths" and 3 "improvements". Include at least 3 items in "improvements_detailed" with quotes and improved versions.
- Be confident awarding Band 9 where fully deserved; do not downgrade for invented minor flaws.

OFFICIAL IELTS WRITING BAND DESCRIPTORS (reference):

Task Achievement (Task 1) / Task Response (Task 2)
Band 9: Fully satisfies all parts of the task; presents a fully developed response.
Band 8: Sufficiently covers all parts of the task; presents a well-developed response.
Band 7: Covers all requirements of the task; presents a clear overview/purpose.
Band 6: Addresses all parts of the task, though some may be more fully covered than others.
Band 5: Addresses the task only partially; format may be inappropriate.
Band 4: Responds to the task only in a minimal way; content is tangential.
Band 3: Does not address the task; content is irrelevant.
Band 2: Barely responds to the task; content is barely related.

Coherence and Cohesion
Band 9: Uses cohesion in such a way that it attracts no attention; skillfully manages paragraphing.
Band 8: Sequences information and ideas logically; manages all aspects of cohesion well; uses paragraphing sufficiently and appropriately.
Band 7: Logically organizes information and ideas; there is a clear progression throughout; uses a range of cohesive devices appropriately.
Band 6: Arranges information and ideas coherently; there is a clear overall progression; uses cohesive devices effectively, but may have some errors.
Band 5: Presents information with some organization but there may be a lack of overall progression; makes inadequate, inaccurate or overuse of cohesive devices.
Band 4: Presents information and ideas but these are not logically organized and may be difficult to follow.
Band 3: Does not organize ideas logically.
Band 2: Has very little control of organizational features.

Lexical Resource (Vocabulary)
Band 9: Uses a wide range of vocabulary with very natural and sophisticated control; rare minor errors occur only as 'slips'.
Band 8: Uses a wide vocabulary resource readily and flexibly; skillfully uses less common items; produces rare errors in spelling/word formation.
Band 7: Uses a sufficient range of vocabulary to allow some flexibility and precision; uses some less common lexical items with some awareness of style and collocation; may produce occasional errors in word choice or spelling.
Band 6: Uses an adequate range of vocabulary for the task; attempts to use less common vocabulary but with some inaccuracy; makes some errors in spelling/word formation, but they do not impede communication.
Band 5: Uses a limited range of vocabulary, but this is minimally adequate for the task; may make noticeable errors in spelling/word formation that may cause some difficulty for the reader.
Band 4: Uses only basic vocabulary which may be used repetitively or which may be inappropriate for the task.
Band 3: Uses only a very limited range of words and expressions with very limited control.
Band 2: Uses only isolated words.

Grammatical Range and Accuracy
Band 9: Uses a wide range of structures with full flexibility and accuracy; rare minor 'slips'.
Band 8: Uses a wide range of structures; the majority of sentences are error-free; makes only very occasional errors or inappropriacies.
Band 7: Uses a variety of complex structures; produces frequent error-free sentences; has good control of grammar and punctuation but may make a few errors.
Band 6: Uses a mix of simple and complex sentence forms; makes some errors in grammar and punctuation but they rarely reduce communication.
Band 5: Uses only a limited range of structures; attempts complex sentences but these tend to be less accurate than simple sentences; makes frequent grammatical errors that can cause some difficulty for the reader.
Band 4: Uses only very basic sentence structures and makes frequent errors that cause comprehension problems.
Band 3: Cannot use sentence forms except in memorised phrases.
Band 2: Cannot produce basic sentence forms.

Return ONLY JSON. Do not output any markdown or prose outside the JSON. Begin your assessment.`
          },
          {
            role: 'user',
            content: examinerPrompt
          }
        ],
        max_completion_tokens: 2000,
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