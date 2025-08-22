import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Span {
  text: string;
  status: 'error' | 'improvement' | 'neutral';
}

interface EnhancedCorrection {
  id: string;
  originalText: string;
  correctedText: string;
  category: 'grammar' | 'vocabulary' | 'style' | 'punctuation' | 'structure';
  severity: 'minor' | 'moderate' | 'major';
  explanation: string;
  example?: string;
  position: { start: number; end: number };
}

interface EnhancedCorrectionResult {
  original_spans: Span[];
  corrected_spans: Span[];
  corrections: EnhancedCorrection[];
  summary: {
    totalCorrections: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
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
    if (!deepSeekApiKey) {
      throw new Error('Missing DEEPSEEK_API_KEY');
    }

    const { userSubmission, questionPrompt } = (await req.json()) as AnalyzeRequest;

    if (!userSubmission || typeof userSubmission !== 'string') {
      throw new Error('userSubmission is required and must be a string');
    }

    const system = `You are a meticulous IELTS examiner and professional academic editor.
Your goal is to provide comprehensive feedback and improvements to reach Band 8.5+ quality.
Even for high-quality writing (Band 7+), identify opportunities for enhancement:
- Upgrade vocabulary to more sophisticated alternatives
- Refine sentence structures for better flow and variety
- Polish grammar and punctuation for perfect accuracy
- Enhance cohesion and coherence
- Improve precision and academic tone

Be thorough: find at least 5-10 areas for improvement in any text, even if it's already strong.
Focus on: (1) lexical sophistication, (2) syntactic complexity, (3) precision, (4) academic register, (5) cohesive devices.
Return ONLY valid JSON as specified. No extra prose.`;

    const user = `Context (IELTS prompt):
${questionPrompt || 'N/A'}

Student submission (verbatim):
"""
${userSubmission}
"""

Your tasks:
1) Create original_spans and corrected_spans as before
2) Provide detailed corrections array with categorized feedback

Output STRICTLY this JSON structure (no markdown or commentary):
{
  "original_spans": [ {"text": string, "status": "error"|"neutral"}, ... ],
  "corrected_spans": [ {"text": string, "status": "improvement"|"neutral"}, ... ],
  "corrections": [
    {
      "id": "unique_id",
      "originalText": "text that was changed",
      "correctedText": "improved text", 
      "category": "grammar|vocabulary|style|punctuation|structure",
      "severity": "minor|moderate|major",
      "explanation": "Clear explanation of why this change improves the writing",
      "example": "Optional: additional example or context",
      "position": {"start": number, "end": number}
    }
  ],
  "summary": {
    "totalCorrections": number,
    "byCategory": {"grammar": number, "vocabulary": number, "style": number, "punctuation": number, "structure": number},
    "bySeverity": {"minor": number, "moderate": number, "major": number}
  }
}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepSeekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_tokens: 2200,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API error: ${err}`);
    }

    const data = await response.json();
    let content: string = data?.choices?.[0]?.message?.content ?? '';

    let json: EnhancedCorrectionResult | null = null;
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

    // Ensure corrections array exists, even if empty
    if (!Array.isArray(json.corrections)) {
      json.corrections = [];
    }

    // Ensure summary exists with defaults
    if (!json.summary) {
      json.summary = {
        totalCorrections: json.corrections.length,
        byCategory: { grammar: 0, vocabulary: 0, style: 0, punctuation: 0, structure: 0 },
        bySeverity: { minor: 0, moderate: 0, major: 0 }
      };
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
      corrections: json.corrections || [],
      summary: json.summary || {
        totalCorrections: 0,
        byCategory: { grammar: 0, vocabulary: 0, style: 0, punctuation: 0, structure: 0 },
        bySeverity: { minor: 0, moderate: 0, major: 0 }
      }
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
