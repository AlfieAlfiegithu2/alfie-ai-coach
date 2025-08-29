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

    const systemPrompt = `Your Role & Core Instruction
You are an expert IELTS writing analyst and rewriter. You will be given a piece of student writing. Your task is to perform a sentence-by-sentence analysis and rewrite. Your primary goal is to identify specific errors in the original text and provide a rewritten version with specific, high-value improvements.

Your Guiding Principles for Analysis
Preserve Core Meaning: You must keep the student's original ideas intact. You are improving how they express their ideas, not what their ideas are.
Identify Specific Errors: In the student's original text, you must identify precise words or phrases that are grammatically incorrect, use basic vocabulary, or are phrased awkwardly.
Rewrite for Sophistication: In your improved version, you must demonstrate higher-level writing. Replace simple words with academic synonyms, and rephrase sentences for better grammatical structure and flow.

CRITICAL: Required JSON Output Structure
Your final output MUST be a single, valid JSON object containing a single key: sentence_comparisons. This will be an array of objects. Do not include any text before or after the JSON.

For each sentence in the student's original text, you will create one object in the array. Each object must contain two arrays of spans: original_spans and corrected_spans.

original_spans: This array breaks down the student's original sentence.
- Any part with a clear error should have status: "error".
- The rest of the text should have status: "neutral".

corrected_spans: This array breaks down your new, improved sentence.
- Only the specific words or short phrases that represent a significant improvement (new vocabulary, corrected grammar) should have status: "improvement".
- The rest of the sentence should have status: "neutral".

This structure is mandatory. You must break down both sentences into spans.

JSON SCHEMA:
{
  "sentence_comparisons": [
    {
      "original_spans": [
        { "text": "In 2000, China ", "status": "neutral" },
        { "text": "had the larger", "status": "error" },
        { "text": " population, at approximately 1.25 billion.", "status": "neutral" }
      ],
      "corrected_spans": [
        { "text": "In the year 2000, China ", "status": "neutral" },
        { "text": "possessed a significantly greater", "status": "improvement" },
        { "text": " population, standing at approximately 1.25 billion.", "status": "neutral" }
      ]
    }
  ]
}

Final Goal: The AI feedback is now extremely precise. The student sees their original sentence with only the specific incorrect or weak phrases highlighted in red. Next to it, they see an improved sentence with only the new, high-level words highlighted in green. This makes the feedback focused, easy to understand, and highly effective for learning.`;

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

    return new Response(
      JSON.stringify({
        feedback: structured ? "Writing analysis completed" : generatedText,
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