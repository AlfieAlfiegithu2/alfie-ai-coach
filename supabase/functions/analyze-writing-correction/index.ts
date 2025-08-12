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

    const system = `You are a strict but helpful IELTS examiner and professional academic editor.
Your goal is to transform writing to Band 7.5+ quality while preserving intended meaning.
Be decisive: actively rephrase awkward or informal sentences to formal, natural academic English.
Focus on: (1) sophisticated lexical resource, (2) varied sentence structures, (3) precise grammar & punctuation, (4) clear cohesion.
Return ONLY valid JSON as specified. No extra prose.`;

    const user = `Context (IELTS prompt):\n${questionPrompt || 'N/A'}\n\nStudent submission (verbatim):\n"""\n${userSubmission}\n"""\n\nYour tasks:\n1) Create original_spans by splitting the ORIGINAL text into ordered spans whose concatenation exactly reconstructs the input (preserve all spaces and punctuation). Mark status:\n   - "error" for spans that contain grammar/spelling/usage/collocation issues or awkward phrasing\n   - "neutral" for correctly written or acceptable segments\n   Keep spans small (a few words) to localize issues precisely.\n\n2) Produce a fully improved, Band 7.5+ CORRECTED text that uses advanced vocabulary, more natural academic phrasing, and varied sentence structures. Then split it into corrected_spans. Mark status:\n   - "improvement" ONLY for spans that reflect a meaningful change (lexical sophistication, grammar correctness, or sentence restructuring).\n   - "neutral" for unchanged/identical segments.\n   Do NOT mark trivial punctuation-only changes as improvements unless they fix a genuine error.\n\nOutput STRICTLY this JSON (no markdown or commentary):\n{\n  "original_spans": [ {"text": string, "status": "error"|"neutral"}, ... ],\n  "corrected_spans": [ {"text": string, "status": "improvement"|"neutral"}, ... ]\n}`;

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
        max_tokens: 2200,
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
