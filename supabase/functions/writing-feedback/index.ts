import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callKimiK2Thinking(prompt: string, systemPrompt: string, apiKey: string, retryCount = 0) {
  console.log(`🚀 Attempting Kimi K2 Thinking API call via OpenRouter (attempt ${retryCount + 1}/2)...`);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://englishaidol.com',
        'X-Title': 'Writing Feedback'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-thinking',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 12000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Kimi K2 Thinking API Error:', errorText);
      throw new Error(`Kimi K2 Thinking API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Kimi K2 Thinking API call successful`);
    
    // Extract content from response (OpenRouter format)
    return data.choices?.[0]?.message?.content ?? '';
  } catch (error) {
    console.error(`❌ Kimi K2 Thinking attempt ${retryCount + 1} failed:`, (error as any).message);
    
    if (retryCount < 1) {
      console.log(`🔄 Retrying Kimi K2 Thinking API call in 500ms...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return callKimiK2Thinking(prompt, systemPrompt, apiKey, retryCount + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for OpenRouter API key (primary) or Gemini API key (fallback)
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!openRouterApiKey && !geminiApiKey) {
      console.error('❌ No API key configured for writing feedback. Available env vars:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Writing feedback service temporarily unavailable. Please try again in a moment.',
        details: 'No API key configured (OpenRouter or Gemini)'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ API key found for writing feedback:', openRouterApiKey ? 'OpenRouter' : 'Gemini');

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

CRITICAL COVERAGE RULES
- You MUST analyze EVERY sentence in the student's text. For each sentence in the input, output EXACTLY one object in sentence_comparisons.
- For EACH sentence, produce:
  - original_spans: spans that cover the ENTIRE original sentence (no gaps). Mark only the truly problematic words/phrases as status: "error"; everything else is status: "neutral".
  - corrected_spans: spans that cover the ENTIRE improved sentence (no gaps). Mark only the new or improved words/phrases as status: "improvement"; everything else is status: "neutral".
- Do NOT highlight whole sentences unless the entire sentence is changed. Highlight only specific changed words/phrases.
- IMPORTANT: For each sentence, ensure there is at least ONE improvement span unless the sentence is already native-like and error-free. If a sentence is perfect, keep the corrected sentence identical and mark all spans as neutral (no false changes).
- Preserve the student's original meaning. Improve clarity, vocabulary, precision, and grammar while keeping the core idea intact.

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
- The corrected sentence should generally differ from the original; ensure at least one improvement span is present for most sentences.

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

Final Goal: The AI feedback is precise and complete. The student sees their original sentence with only the specific incorrect or weak phrases highlighted in red. Next to it, they see an improved sentence with only the new, high-level words highlighted in green. This must cover EVERY sentence in the input.`;

    let generatedText: string = '';
    
    // Primary: Kimi K2 Thinking via OpenRouter
    if (openRouterApiKey) {
      try {
        console.log('🔄 Using Kimi K2 Thinking (OpenRouter) as primary model...');
        generatedText = await callKimiK2Thinking(feedbackPrompt, systemPrompt, openRouterApiKey);
        console.log('✅ Kimi K2 Thinking succeeded, response length:', generatedText.length);
      } catch (kimiError) {
        console.log('⚠️ Kimi K2 Thinking failed, falling back to Gemini:', (kimiError as any).message);
        
        // Fallback: Gemini
        if (geminiApiKey) {
          console.log('🔄 Fallback: Using Gemini API...');
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
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
                temperature: 0.2,
                maxOutputTokens: 12000,
                topP: 0.9,
                topK: 50
              }
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            console.error('❌ Gemini API Error:', data);
            throw new Error(`Gemini API request failed: ${data.error?.message || 'Unknown error'}`);
          }

          generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          
          if (!generatedText) {
            console.error('❌ No content returned from Gemini API');
            throw new Error('No content returned from writing analysis');
          }

          console.log('✅ Gemini fallback succeeded, response length:', generatedText.length);
        } else {
          throw new Error('Kimi K2 Thinking failed and no Gemini API key available for fallback');
        }
      }
    } else {
      // No OpenRouter key, use Gemini directly
      console.log('🔄 Using Gemini API (no OpenRouter key)...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
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
            temperature: 0.2,
            maxOutputTokens: 12000,
            topP: 0.9,
            topK: 50
          }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Gemini API Error:', data);
        throw new Error(`Gemini API request failed: ${data.error?.message || 'Unknown error'}`);
      }

      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      
      if (!generatedText) {
        console.error('❌ No content returned from Gemini API');
        throw new Error('No content returned from writing analysis');
      }

      console.log('✅ Writing analysis completed, response length:', generatedText.length);
    }

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

    // Post-process to enforce improvements where missing using a word-level diff
    const buildDiffSpans = (orig: string, imp: string) => {
      const o = orig.split(/\s+/);
      const p = imp.split(/\s+/);
      const n = o.length, m = p.length;
      const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = o[i] === p[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      const keepO = Array(n).fill(false), keepP = Array(m).fill(false);
      let i = 0, j = 0; while (i < n && j < m) { if (o[i] === p[j]) { keepO[i] = keepP[j] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
      const push = (arr: any[], text: string, status: string) => { const t = text.replace(/\s+/g,' ').trim(); if (t.length) arr.push({ text: t + ' ', status }); };
      const original_spans: any[] = []; const corrected_spans: any[] = [];
      let buf = '', cur = 'neutral';
      for (let t = 0; t < n; t++) { const ns = keepO[t] ? 'neutral' : 'error'; if (t === 0) cur = ns; if (ns !== cur) { push(original_spans, buf, cur); buf=''; cur=ns; } buf += (buf?' ':'') + o[t]; }
      push(original_spans, buf, cur);
      buf = ''; cur = 'neutral';
      for (let t = 0; t < m; t++) { const ns = keepP[t] ? 'neutral' : 'improvement'; if (t === 0) cur = ns; if (ns !== cur) { push(corrected_spans, buf, cur); buf=''; cur=ns; } buf += (buf?' ':'') + p[t]; }
      push(corrected_spans, buf, cur);
      return { original_spans, corrected_spans };
    };

    const spanHasImprovement = (spans: any[] | undefined) => Array.isArray(spans) && spans.some(s => s?.status === 'improvement');

    if (structured && Array.isArray(structured.sentence_comparisons)) {
      structured.sentence_comparisons = structured.sentence_comparisons.map((s: any) => {
        const originalText = Array.isArray(s.original_spans) ? s.original_spans.map((x: any) => x?.text || '').join('').trim() : (s.original || '');
        const improvedText = Array.isArray(s.corrected_spans) ? s.corrected_spans.map((x: any) => x?.text || '').join('').trim() : (s.improved || '');
        const needRepair = !spanHasImprovement(s.corrected_spans) || !Array.isArray(s.original_spans) || !Array.isArray(s.corrected_spans);
        if (needRepair && originalText && improvedText) {
          const d = buildDiffSpans(originalText, improvedText);
          s.original_spans = d.original_spans;
          s.corrected_spans = d.corrected_spans;
        }
        return s;
      });
    } else {
      // If the model didn't return sentence_comparisons, synthesize a minimal one from the raw text
      const raw = typeof generatedText === 'string' ? generatedText : '';
      const parts = (raw || '').split(/\n+/).filter(Boolean).slice(0, 4);
      if (!structured) structured = {} as any;
      structured.sentence_comparisons = (parts.length ? parts : [writing]).map((p: string) => {
        const d = buildDiffSpans(p, p);
        return { original_spans: d.original_spans, corrected_spans: d.corrected_spans };
      });
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