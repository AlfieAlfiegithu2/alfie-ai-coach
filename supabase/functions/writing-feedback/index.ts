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
    // Check if Gemini API key is configured
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('❌ Gemini API key not configured for writing feedback. Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Writing feedback service temporarily unavailable. Please try again in a moment.',
        details: 'Gemini API key not configured'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Gemini API key found for writing feedback, length:', geminiApiKey.length);

    const { writing, prompt, taskType } = await req.json();

    console.log('📝 Writing analysis request:', {
      writingLength: writing?.length || 0,
      promptPresent: !!prompt,
      taskType
    });

    if (!writing || typeof writing !== 'string' || writing.trim().length < 10) {
      return new Response(JSON.stringify({
        error: 'Please provide substantial writing content (at least 10 characters) for analysis.',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const feedbackPrompt = `TASK DETAILS:
Type: ${taskType || 'General Writing'}
Original Prompt: ${prompt || 'Not provided'}

STUDENT WRITING TO ANALYZE:
"${writing}"

Please analyze this writing and provide constructive feedback.`;

    const systemPrompt = `You are "Examiner-7," a senior, Cambridge-certified IELTS examiner. Be decisive and strictly follow the official band descriptors. New Guiding Principle: if the response fully meets Band 9, award Band 9—do not invent minor flaws.

CRITICAL feedback requirement: For each area for improvement, include a direct quote from the student's writing and a stronger improved version, plus a brief explanation. Provide these in feedback.improvements_detailed as an array of objects with keys: issue, sentence_quote, improved_version, explanation.

ADDITIONAL REQUIREMENT: Provide inline corrections for display. Create two versions of the text:
1. "annotated_original": Original text with <error data-type="[error_type]" data-explanation="[brief explanation]">error text</error> tags around errors
2. "annotated_corrected": Corrected text with <correction data-type="[error_type]">corrected text</correction> tags around fixes
3. "corrections": Array of correction objects with: original_text, corrected_text, start_index, end_index, error_type, explanation

Return ONLY JSON. Use whole or half bands only (0, 0.5, …, 9). Apply IELTS rounding rules where averages are used.

JSON STRUCTURE:
{
  "overall_band": 7.5,
  "criteria": {
    "task_achievement": { "band": 8.0, "justification": "Detailed reasoning..." },
    "coherence_and_cohesion": { "band": 7.0, "justification": "..." },
    "lexical_resource": { "band": 7.5, "justification": "..." },
    "grammatical_range_and_accuracy": { "band": 7.5, "justification": "..." }
  },
  "feedback": {
    "strengths": ["strength1", "strength2", "strength3"],
    "improvements": ["improvement1", "improvement2", "improvement3"],
    "improvements_detailed": [
      {
        "issue": "Grammar - tense inconsistency",
        "sentence_quote": "Yesterday I was go to the store",
        "improved_version": "Yesterday I went to the store",
        "explanation": "Past simple tense should be used for completed actions in the past"
      }
    ]
  },
  "annotated_original": "Text with <error>errors</error> marked",
  "annotated_corrected": "Text with <correction>corrections</correction>",
  "corrections": [
    {
      "original_text": "was go",
      "corrected_text": "went", 
      "start_index": 15,
      "end_index": 21,
      "error_type": "grammar",
      "explanation": "Incorrect tense usage"
    }
  ],
  "feedback_markdown": "Detailed markdown feedback..."
}

Rate according to IELTS descriptors. Justify each band score with specific evidence from the text.

Be specific, constructive, and provide actionable feedback that helps achieve higher band scores.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${feedbackPrompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Gemini API Error:', data);
      throw new Error(`Gemini API request failed: ${data.error?.message || 'Unknown error'}`);
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('❌ No content returned from Gemini API');
      throw new Error('No content returned from writing analysis');
    }

    console.log('✅ Writing analysis completed, response length:', generatedText.length);

    let structured: any = null;
    try {
      structured = JSON.parse(generatedText);
    } catch (_e) {
      // Attempt to extract JSON blob if any wrapping text leaked
      const match = generatedText.match(/\{[\s\S]*\}/);
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
    const feedbackText = structured?.feedback_markdown || generatedText;

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