import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    const { focusText, minutesPerDay = 45, days = 7, firstLanguage = 'en', level = 'B1' } = await req.json();
    if (!focusText || String(focusText).trim().length === 0) throw new Error('focusText required');

    const prompt = `You are an IELTS coach. The student wrote the following (may be ${firstLanguage}):\n---\n${focusText}\n---\n\nReturn ONLY JSON in this schema: {\"days\":[{\"tasks\":[{\"title\":\"...\",\"minutes\":15}]}]}\nRules:\n- Create ${days} days. 3-4 tasks/day. Total ${minutesPerDay} minutes/day.\n- Tailor difficulty for ${level}.\n- Keep IELTS keywords in English (Task 1/2, cohesion, band, etc.).\n- If first language is not English, make titles bilingual: Localized + (English keyword).`;

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.3
    } as const;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`OpenAI error: ${t}`);
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    let parsed: any; try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const normalized = Array.isArray(parsed) ? parsed : (parsed.days || []);
    return new Response(JSON.stringify({ success: true, days: normalized }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


