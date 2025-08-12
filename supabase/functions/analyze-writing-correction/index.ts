import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Span {
  text: string;
  status: 'error' | 'improvement' | 'neutral';
}

interface AnalyzeRequest {
  userSubmission: string;
  questionPrompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    const { userSubmission, questionPrompt } = (await req.json()) as AnalyzeRequest;

    if (!userSubmission || typeof userSubmission !== 'string') {
      throw new Error('userSubmission is required and must be a string');
    }

    const system = `You are an expert IELTS writing examiner and editor.
Return ONLY valid JSON matching the exact schema with two arrays: original_spans and corrected_spans.
Do not include any extra commentary.`;

    const user = `Task prompt (context for meaning):\n${questionPrompt || 'N/A'}\n\nStudent submission:\n"""\n${userSubmission}\n"""\n\nInstructions:\n- Identify all spelling, grammar, and vocabulary errors in the student's original text. Split the ORIGINAL text into an ordered sequence of spans so that concatenating all span.text exactly reconstructs the original text (preserve whitespaces and punctuation).\n- For each span in original_spans, set status to:\n  - "error" for segments containing a mistake\n  - "neutral" for unchanged text\n- Create a corrected/improved version of the entire text. Split it into corrected_spans with the same rules, where status is:\n  - "improvement" for added/changed words or phrases that improve the text\n  - "neutral" for unchanged text\n- Keep spans small (a few words) so highlighting is precise.\n- The arrays may differ in length and segmentation; that's fine.\n- IMPORTANT: Output must be strictly JSON in this exact structure:\n{\n  "original_spans": [ {"text": string, "status": "error"|"neutral"}, ... ],\n  "corrected_spans": [ {"text": string, "status": "improvement"|"neutral"}, ... ]\n}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_tokens: 1800,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const data = await response.json();
    let content: string = data?.choices?.[0]?.message?.content ?? '';

    let json: { original_spans: Span[]; corrected_spans: Span[] } | null = null;
    try {
      json = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { json = JSON.parse(match[0]); } catch {}
      }
    }

    if (!json || !Array.isArray(json.original_spans) || !Array.isArray(json.corrected_spans)) {
      throw new Error('AI did not return the expected JSON structure.');
    }

    // Sanitize spans to ensure types are correct
    const sanitize = (arr: any[], allowed: string[]): Span[] =>
      arr.map((s) => ({
        text: typeof s?.text === 'string' ? s.text : String(s?.text ?? ''),
        status: allowed.includes(s?.status) ? s.status : 'neutral',
      }));

    const result = {
      original_spans: sanitize(json.original_spans, ['error', 'neutral']),
      corrected_spans: sanitize(json.corrected_spans, ['improvement', 'neutral']),
    };

    console.log('✅ analyze-writing-correction: spans generated', {
      originalCount: result.original_spans.length,
      correctedCount: result.corrected_spans.length,
      submissionChars: userSubmission.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ analyze-writing-correction error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
