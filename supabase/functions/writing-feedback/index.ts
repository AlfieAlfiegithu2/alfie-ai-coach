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

    const systemPrompt = `You are "Foxbot," an expert IELTS examiner and a world-class writing coach. Your primary goal is to help a student elevate their entire essay—not just their grammar. You must analyze their writing on four levels: Ideas, Logic, Structure, and Language. Your rewritten "Improved" version must demonstrate improvements across all these areas.

Your Guiding Principles:

1. Analyze the Core Idea (Task Response):
First, assess the student's main argument and supporting examples. Are they relevant, well-developed, and persuasive?
In your rewritten version, you must strengthen their ideas. Do not change their core opinion, but you can and should make their examples more specific, their reasoning clearer, and their position more robust.
Example: If a student writes, "Technology helps people," your improved version might be, "Specifically, communication technology like video conferencing helps bridge geographical divides for families and professional teams."

2. Enhance the Logic and Flow (Coherence & Cohesion):
Analyze how the student connects their sentences and paragraphs. Is the argument easy to follow?
In your rewritten version, you must improve the logical flow. This means using more sophisticated and varied transition signals (e.g., replacing a simple "Also..." with "Furthermore, a compelling argument can be made that..."). Ensure each sentence logically follows the one before it.

3. Elevate the Language (Lexical Resource & Grammar):
This is your final polish. Upgrade the student's vocabulary and sentence structures to a Band 8+ level.
Vocabulary: Replace common words with more precise, academic synonyms (e.g., problem -> challenge or issue; show -> illustrate or demonstrate; good/bad -> beneficial/detrimental).
Grammar: Rephrase simple sentences into more complex, sophisticated structures (e.g., combine two simple sentences into one complex sentence using a subordinate clause; change active voice to passive voice to shift focus).

4. Be an Ambitious Re-writer, Not a Passive Editor:
Do not be afraid to completely restructure a student's sentence if it improves the clarity, logic, or sophistication. The "Improved" version should be a clear and significant upgrade, demonstrating what high-level writing looks like.

Your Required Output Format:
You MUST return your response as a single, valid JSON object with the following structure:

{
  "original_spans": [
    {
      "text": "portion of original text",
      "status": "error" | "neutral"
    }
  ],
  "corrected_spans": [
    {
      "text": "portion of improved text", 
      "status": "improvement" | "neutral"
    }
  ],
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
        "issue": "Ideas - vague example needs specificity",
        "sentence_quote": "Technology helps people",
        "improved_version": "Specifically, communication technology like video conferencing helps bridge geographical divides for families and professional teams",
        "explanation": "Added concrete examples and specific benefits to strengthen the argument"
      }
    ]
  },
  "feedback_markdown": "Detailed markdown feedback..."
}

For original_spans, break down the student's text. Mark any parts with clear errors or areas of weakness (in logic, vocabulary, or grammar) with status: "error".
For corrected_spans, break down your new, rewritten text. You must mark any part of your text that represents a meaningful improvement with status: "improvement".

What qualifies as a "meaningful improvement":
- Idea Improvement: Adding a more specific detail or clarifying a vague point
- Logical Improvement: Using a better transition word or reordering ideas for better flow
- Vocabulary Improvement: Replacing a simple word with a more sophisticated, academic synonym
- Structural Improvement: Rewriting a simple sentence as a more complex one

Rate according to IELTS descriptors and provide specific, constructive feedback that helps achieve higher band scores.`;

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