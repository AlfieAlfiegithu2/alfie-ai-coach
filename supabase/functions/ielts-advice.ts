// Deno Deploy Edge Function for generating IELTS study advice using Gemini 2.5 Flash
// Env: GEMINI_API_KEY

// deno-lint-ignore no-explicit-any
const corsHeaders: any = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// deno-lint-ignore no-explicit-any
function adviceTemplate(input: any) {
  const weakest: string[] = [];
  const subs = input?.score?.subs || {};
  const order: Array<keyof typeof subs> = ['reading','listening','grammar','vocab'] as any;
  const sorted = order
    .map(k => ({ k, v: subs[k] ?? 0 }))
    .sort((a, b) => a.v - b.v);
  weakest.push(...sorted.slice(0, 2).map(x => String(x.k)));

  const focus = `Focus this week on ${weakest[0]} and ${weakest[1]} using short, timed sets and daily review.`;
  return {
    weekly_focus: focus,
    daily_tips: [
      'Use 10–12 minute blocks; stop when timer ends and reflect for 1 minute.',
      'Write brief notes after tasks: 1 mistake, 1 fix, 1 next step.',
      'Revisit yesterday’s weakest item first (spaced review).'
    ],
    skill_advice: {
      reading: 'Practice inference and reference questions. Highlight pronouns and linking words before answering.',
      listening: 'Drill numbers/dates and paraphrases. Predict likely answers from the question form first.',
      grammar: 'Target articles and SVA with 10 items/day; say each corrected sentence aloud.',
      vocabulary: 'Build 8–12 collocations/day and produce one example sentence per collocation.'
    },
    repeat_policy: { allow_repeat: true, cadence: 'daily' }
  };
}

async function callGemini(systemPrompt: string, payload: unknown): Promise<any | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\nINPUT:\n${JSON.stringify(payload)}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
    return json;
  } catch (_) { return null; }
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const systemPrompt = `You are an IELTS coach. Return STRICT JSON with keys: weekly_focus (string), daily_tips (string[3]), skill_advice {reading,listening,grammar,vocabulary}, repeat_policy {allow_repeat:boolean, cadence:string}. Keep advice concise and actionable.`;
    const gemini = await callGemini(systemPrompt, body);
    const result = gemini || adviceTemplate(body);
    return new Response(JSON.stringify({ success: true, advice: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


