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
    // Check if OpenAI API key is configured
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not configured for writing feedback. Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Writing feedback service temporarily unavailable. Please try again in a moment.',
        details: 'OpenAI API key not configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ OpenAI API key found for writing feedback, length:', openaiApiKey.length);

    const { writing, prompt, taskType } = await req.json();

    if (!writing || !prompt) {
      throw new Error('Writing content and prompt are required');
    }

    const feedbackPrompt = `You are a senior, highly experienced IELTS examiner. Your goal is to provide a holistic and accurate assessment based *only* on the official IELTS band descriptors and scoring rules provided below. Evaluate the student's response against these criteria and justify your feedback by referencing them.

Focus on overall communicative effectiveness. Do not just count errors; explain their impact on the band score for a specific criterion.

You will first provide a whole number band score (0-9) for each of the four criteria. Then, you will calculate the Overall Band Score according to the specific rounding rules provided at the end.

ADDITIONALLY, provide detailed inline corrections by identifying specific errors in the text and marking them for display with corrections.

Now, please assess the following submission against the relevant band descriptors:

TASK PROMPT: ${prompt}

STUDENT RESPONSE:
"${writing}"

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

Please return your assessment in the following structured format:

**TASK ACHIEVEMENT/RESPONSE**: [Band Score 0-9 with detailed justification]
**COHERENCE & COHESION**: [Band Score 0-9 with detailed justification]
**LEXICAL RESOURCE**: [Band Score 0-9 with detailed justification]
**GRAMMATICAL RANGE & ACCURACY**: [Band Score 0-9 with detailed justification]
**OVERALL BAND SCORE**: [Final calculated score following the rounding rules above]
**DETAILED FEEDBACK**: [Comprehensive analysis with specific examples and improvement recommendations]

Be specific, constructive, and provide actionable feedback that helps achieve higher band scores.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are "Examiner-7," a senior, Cambridge-certified IELTS examiner. Be decisive and strictly follow the official band descriptors. New Guiding Principle: if the response fully meets Band 9, award Band 9—do not invent minor flaws.

CRITICAL feedback requirement: For each area for improvement, include a direct quote from the student's writing and a stronger improved version, plus a brief explanation. Provide these in feedback.improvements_detailed as an array of objects with keys: issue, sentence_quote, improved_version, explanation.

ADDITIONAL REQUIREMENT: Provide inline corrections for display. Create two versions of the text:
1. "annotated_original": Original text with <error data-type="[error_type]" data-explanation="[brief explanation]">error text</error> tags around errors
2. "annotated_corrected": Corrected text with <correction data-type="[error_type]">corrected text</correction> tags around fixes
3. "corrections": Array of correction objects with: original_text, corrected_text, start_index, end_index, error_type, explanation

Return ONLY JSON. Use whole or half bands only (0, 0.5, …, 9). Apply IELTS rounding rules where averages are used.`
          },
          {
            role: 'user',
            content: feedbackPrompt
          }
        ],
        max_completion_tokens: 1500,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Writing analysis failed: ${await response.text()}`);
    }

    const result = await response.json();
    let content = result.choices?.[0]?.message?.content ?? '';

    let structured: any = null;
    try {
      structured = JSON.parse(content);
    } catch (_e) {
      // Attempt to extract JSON blob if any wrapping text leaked
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
    const feedbackText = structured?.feedback_markdown || content;

    return new Response(
      JSON.stringify({
        feedback: feedbackText,
        wordCount: writing.trim().split(/\s+/).length,
        structured,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Writing feedback error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});