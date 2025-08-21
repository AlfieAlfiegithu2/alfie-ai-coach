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

// Tokenize into words, whitespace, and punctuation, preserving everything
function tokenize(input: string): string[] {
  return input.match(/\w+|\s+|[^\w\s]/g) || [];
}

// Compute LCS-based diff between token arrays
function diffTokens(a: string[], b: string[]) {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  type Op = { type: 'equal' | 'insert' | 'delete'; tokensA?: string[]; tokensB?: string[] };
  const ops: Op[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      // equal token
      const tk = a[i];
      if (!ops.length || ops[ops.length - 1].type !== 'equal') ops.push({ type: 'equal', tokensA: [], tokensB: [] });
      ops[ops.length - 1].tokensA!.push(tk);
      ops[ops.length - 1].tokensB!.push(tk);
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // delete from a
      const tk = a[i];
      if (!ops.length || ops[ops.length - 1].type !== 'delete') ops.push({ type: 'delete', tokensA: [], tokensB: [] });
      ops[ops.length - 1].tokensA!.push(tk);
      i++;
    } else {
      // insert into b
      const tk = b[j];
      if (!ops.length || ops[ops.length - 1].type !== 'insert') ops.push({ type: 'insert', tokensA: [], tokensB: [] });
      ops[ops.length - 1].tokensB!.push(tk);
      j++;
    }
  }
  while (i < n) {
    const tk = a[i++];
    if (!ops.length || ops[ops.length - 1].type !== 'delete') ops.push({ type: 'delete', tokensA: [], tokensB: [] });
    ops[ops.length - 1].tokensA!.push(tk);
  }
  while (j < m) {
    const tk = b[j++];
    if (!ops.length || ops[ops.length - 1].type !== 'insert') ops.push({ type: 'insert', tokensA: [], tokensB: [] });
    ops[ops.length - 1].tokensB!.push(tk);
  }
  return ops;
}

// Build spans from diff ops ensuring only actual changes are marked as improvements (green)
function buildSpansFromDiff(aText: string, bText: string) {
  const a = tokenize(aText);
  const b = tokenize(bText);
  const ops = diffTokens(a, b);

  const originalSpans: Span[] = [];
  const correctedSpans: Span[] = [];

  const pushSpan = (arr: Span[], text: string, status: Span['status']) => {
    if (!text) return;
    const last = arr[arr.length - 1];
    if (last && last.status === status) {
      last.text += text;
    } else {
      arr.push({ text, status });
    }
  };

  for (const op of ops) {
    if (op.type === 'equal') {
      const t = (op.tokensA || []).join('');
      pushSpan(originalSpans, t, 'neutral');
      pushSpan(correctedSpans, t, 'neutral');
    } else if (op.type === 'delete') {
      const tA = (op.tokensA || []).join('');
      pushSpan(originalSpans, tA, 'error');
      // nothing to add on corrected side for deletions
    } else if (op.type === 'insert') {
      const tB = (op.tokensB || []).join('');
      pushSpan(correctedSpans, tB, 'improvement');
      // nothing on original for insertions
    }
  }

  return { originalSpans, correctedSpans };
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

    const user = `Context (IELTS prompt):\n${questionPrompt || 'N/A'}\n\nStudent submission (verbatim):\n"""\n${userSubmission}\n"""\n\nYour tasks:\n1) Create original_spans by splitting the ORIGINAL text into ordered spans whose concatenation exactly reconstructs the input (preserve all spaces and punctuation). Mark status:\n   - "error" for spans that contain grammar/spelling/usage/collocation issues or awkward phrasing\n   - "neutral" for correctly written or acceptable segments\n   Keep spans small (a few words) to localize issues precisely; avoid whole-sentence spans unless every part is problematic.\n\n2) Produce a fully improved, Band 7.5+ CORRECTED text that uses advanced vocabulary, more natural academic phrasing, and varied sentence structures. Then split it into corrected_spans. Mark status:\n   - "improvement" ONLY for spans that reflect a meaningful change (lexical sophistication, grammar correctness, or sentence restructuring); keep spans tight around the changed words/phrases, not the whole sentence.\n   - "neutral" for unchanged/identical segments.\n   Do NOT mark trivial punctuation-only changes as improvements unless they fix a genuine error.\n\nOutput STRICTLY this JSON (no markdown or commentary):\n{\n  "original_spans": [ {"text": string, "status": "error"|"neutral"}, ... ],\n  "corrected_spans": [ {"text": string, "status": "improvement"|"neutral"}, ... ]\n}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_completion_tokens: 2200,
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

    // Reconstruct full texts from AI output
    const originalFull = json.original_spans.map(s => (typeof s?.text === 'string' ? s.text : '')).join('');
    const correctedFull = json.corrected_spans.map(s => (typeof s?.text === 'string' ? s.text : '')).join('');

    // Post-process with diff to ensure ONLY actual changed tokens are marked green
    const { originalSpans, correctedSpans } = buildSpansFromDiff(originalFull, correctedFull);

    console.log('✅ analyze-writing-correction: spans generated', {
      originalCount: originalSpans.length,
      correctedCount: correctedSpans.length,
      submissionChars: userSubmission.length,
    });

    return new Response(JSON.stringify({
      original_spans: originalSpans,
      corrected_spans: correctedSpans,
    }), {
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
