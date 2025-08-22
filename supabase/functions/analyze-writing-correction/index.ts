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

    const system = `You are an expert IELTS writing corrector who MUST find errors and improvements in student writing.

MANDATORY TASK: Find and highlight 3-8 specific errors and their corrections.

HIGHLIGHTING RULES:
- LEFT SIDE (Original): Mark ONLY the incorrect words/phrases as "error" status → RED highlighting
- RIGHT SIDE (Corrected): Mark ONLY the improved words/phrases as "improvement" status → GREEN highlighting  
- Everything else should be "neutral" status

COMMON IELTS ERRORS TO LOOK FOR:
1. Grammar: verb tenses, subject-verb agreement, articles (a/an/the)
2. Word choice: wrong vocabulary, unclear expressions
3. Structure: run-on sentences, fragments, unclear connections
4. Style: repetitive words, informal language

EXAMPLE:
Student wrote: "I am agree with this statement because it is make sense and help people."

Expected output:
{
  "original_spans": [
    {"text":"I ","status":"neutral"},
    {"text":"am agree","status":"error"},
    {"text":" with this statement because it ","status":"neutral"},
    {"text":"is make","status":"error"},
    {"text":" sense and ","status":"neutral"},
    {"text":"help","status":"error"},
    {"text":" people.","status":"neutral"}
  ],
  "corrected_spans": [
    {"text":"I ","status":"neutral"},
    {"text":"agree","status":"improvement"},
    {"text":" with this statement because it ","status":"neutral"},
    {"text":"makes","status":"improvement"},
    {"text":" sense and ","status":"neutral"},
    {"text":"helps","status":"improvement"},
    {"text":" people.","status":"neutral"}
  ]
}

CRITICAL: You MUST find at least 3 errors in any student writing. Return ONLY valid JSON.`;

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

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
        max_tokens: 1500,
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
    
    // Enhanced JSON parsing with multiple fallback strategies
    try {
      // First try direct parsing
      json = JSON.parse(content);
    } catch {
      try {
        // Remove markdown code blocks if present
        const cleanContent = content.replace(/```json\s*\n?|```\s*\n?/g, '').trim();
        json = JSON.parse(cleanContent);
      } catch {
        try {
          // Extract JSON object from mixed content
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            json = JSON.parse(match[0]);
          }
        } catch {
          // Try to find and fix common JSON issues
          const fixedContent = content
            .replace(/```json\s*\n?|```\s*\n?/g, '')
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .trim();
          try {
            json = JSON.parse(fixedContent);
          } catch {
            console.error('❌ All JSON parsing strategies failed. Content preview:', content.substring(0, 200));
          }
        }
      }
    }

    if (!json) {
      console.error('❌ Could not parse AI response as JSON. Raw content:', content.substring(0, 500));
      throw new Error('AI did not return valid JSON.');
    }

    // Ensure required arrays exist, initialize with fallbacks if missing
    if (!Array.isArray(json.original_spans)) {
      console.warn('⚠️ original_spans missing, using fallback');
      json.original_spans = [{ text: userSubmission, status: 'neutral' }];
    }
    
    if (!Array.isArray(json.corrected_spans)) {
      console.warn('⚠️ corrected_spans missing, using fallback');
      json.corrected_spans = [{ text: userSubmission, status: 'neutral' }];
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

    // Use AI output directly if available, with better validation
    let originalSpans: Span[];
    let correctedSpans: Span[];
    
    if (json.original_spans?.length > 0 && json.corrected_spans?.length > 0) {
      // Filter and validate spans
      originalSpans = json.original_spans.filter(s => s && typeof s.text === 'string' && s.text.length > 0);
      correctedSpans = json.corrected_spans.filter(s => s && typeof s.text === 'string' && s.text.length > 0);
      
      console.log('🔍 AI spans validation:', {
        originalSpansCount: originalSpans.length,
        correctedSpansCount: correctedSpans.length,
        hasErrors: originalSpans.some(s => s.status === 'error'),
        hasImprovements: correctedSpans.some(s => s.status === 'improvement')
      });
      
      // If we have valid spans, use them
      if (originalSpans.length > 0 && correctedSpans.length > 0) {
        // Check if AI actually provided corrections
        const hasErrors = originalSpans.some(s => s.status === 'error');
        const hasImprovements = correctedSpans.some(s => s.status === 'improvement');
        
        if (!hasErrors && !hasImprovements) {
          console.warn('⚠️ AI provided spans but no errors/improvements marked');
        }
      } else {
        console.warn('⚠️ AI spans failed validation, using fallback');
        originalSpans = [{ text: userSubmission, status: 'neutral' }];
        correctedSpans = [{ text: userSubmission, status: 'neutral' }];
      }
    } else {
      console.warn('⚠️ No valid spans from AI, using fallback');
      originalSpans = [{ text: userSubmission, status: 'neutral' }];
      correctedSpans = [{ text: userSubmission, status: 'neutral' }];
    }

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
