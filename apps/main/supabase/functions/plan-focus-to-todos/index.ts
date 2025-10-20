import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { focusText, minutesPerDay = 45, days = 7, firstLanguage = 'en', level = 'B1' } = await req.json();
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
    if (!focusText || typeof focusText !== 'string') throw new Error('focusText required');

    const sys = `You are an IELTS coach. Output JSON only. Create ${days} days of to-dos aligned to IELTS. Keep IELTS keywords in ENGLISH. If firstLanguage != en, make titles bilingual: "Localized (English)". 3-4 tasks/day totaling ~${minutesPerDay} min. Include only fields: {"days":[{"day":1,"tasks":[{"title":"string","minutes":number}]}]}`;
    const user = `Focus: ${focusText}\nLevel: ${level}\nFirst language: ${firstLanguage}`;

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${sys}\n\n${user}` }]}],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200, responseMimeType: 'application/json' }
      })
    });
    if (!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let out: any = {};
    try { out = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); out = m ? JSON.parse(m[0]) : { days: [] }; }

    return new Response(JSON.stringify({ success: true, ...out }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});


