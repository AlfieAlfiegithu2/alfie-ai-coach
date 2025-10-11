import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    if (!DEEPSEEK_API_KEY) throw new Error('Missing DEEPSEEK_API_KEY');
    const { term, context = '', targetLanguage = 'en', nativeLanguage = 'en', level = null } = await req.json();
    if (!term || typeof term !== 'string') throw new Error('term is required');

    const system = `Enrich a vocabulary card. STRICT JSON only.
Schema: {
  "translation": string,
  "ipa": string|null,
  "pos": string|null,
  "examples": string[],
  "conjugation": object|null,
  "synonyms": string[]
}`;

    const user = `Term: ${term}\nTarget language: ${targetLanguage}\nLearner native: ${nativeLanguage}\nContext: ${context?.slice(0, 400)}\nReturn JSON.`;

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
    const out = {
      translation: String(json?.translation || ''),
      ipa: json?.ipa || null,
      pos: json?.pos || null,
      examples: Array.isArray(json?.examples) ? json.examples.slice(0, 6) : [],
      conjugation: json?.conjugation || null,
      synonyms: Array.isArray(json?.synonyms) ? json.synonyms.slice(0, 8) : []
    };

    // Frequency lookup (best-effort)
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: freq } = await supabase
        .from('vocab_frequency')
        .select('rank')
        .eq('language', targetLanguage)
        .eq('lemma', term.toLowerCase())
        .maybeSingle();
      (out as any).frequencyRank = freq?.rank || null;
    } catch {}

    return new Response(JSON.stringify({ success: true, card: { ...out, level } }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


