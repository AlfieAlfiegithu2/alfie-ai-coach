import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    if (!DEEPSEEK_API_KEY) throw new Error('Missing DEEPSEEK_API_KEY');
    const { text, targetLanguage = 'en', nativeLanguage = 'en' } = await req.json();
    if (!text || typeof text !== 'string') throw new Error('text is required');

    const system = `Extract useful vocabulary terms and multi-word expressions and assign a difficulty level 1..5.
Return STRICT JSON only.
Schema: { "terms": [ { "term": string, "phrase": string|null, "context": string, "lemma": string|null, "pos": string|null, "level": 1|2|3|4|5 } ] }
Rules: 1=easiest functional/common; 2=high-frequency everyday; 3=intermediate; 4=upper‑intermediate news/business; 5=academic/common journalistic (no rare/obscure). Avoid names unless very frequent. Keep a real context sentence from input.`;

    const user = `Target language: ${targetLanguage} | Learner native: ${nativeLanguage}
Text:\n${text.slice(0, 4000)}`;

    const prompt = {
      model: 'deepseek-chat',
      messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
      temperature: 0.2,
      max_tokens: 800,
      stream: false
    } as const;

    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(prompt)
    });
    if (!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';
    let json: any = {};
    try { json = JSON.parse(raw); } catch {
      const m = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
      if (m) { try { json = JSON.parse(m[0]); } catch {} }
    }
    const terms = Array.isArray(json?.terms) ? json.terms.slice(0, 50) : [];
    return new Response(JSON.stringify({ success: true, terms }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


