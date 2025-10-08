import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
    const body = await req.json();
    const {
      targetScore = 7.0,
      targetDeadline = null,
      minutesPerDay = 60,
      studyDays = [1,2,3,4,5], // 0=Sun..6=Sat
      firstLanguage = 'en',
      planNativeLanguage = 'no', // 'yes'|'no'
      weakAreas = [], // ['vocab','listening','reading','grammar','writing','speaking']
      notes = ''
    } = body || {};

    const wantNative = String(planNativeLanguage) === 'yes' && firstLanguage && firstLanguage !== 'en';

    const schema = `Return ONLY JSON, no prose. Schema:
{
  "durationWeeks": number,
  "weekly": [
    {"week": number, "days": [{"day": number, "tasks": [{"title": string, "minutes": number}]}]}
  ],
  "highlights": string[],
  "quickWins": string[],
  "meta": {
    "currentLevel": string,
    "currentApproxIELTS": number,
    "targetIELTS": number,
    "dailyMinutes": number,
    "estimatedMonths": number,
    "rationale": string,
    "targetDeadline": string | null,
    "startDateISO": string,
    "firstLanguage": string,
    "planNativeLanguage": "yes" | "no"
  }
}`;

    const system = `You are an IELTS coach. Produce a practical, to-do-list focused plan. Follow IELTS task naming and keep IELTS keywords in ENGLISH. If the student wants native language output (planNativeLanguage=yes and firstLanguage != en), provide bilingual task titles as: Localized Title (English keyword). Ensure highlights and quickWins are also bilingual in that case.`;

    const user = `Student request:
- Target IELTS: ${Number(targetScore).toFixed(1)}
- Deadline: ${targetDeadline || 'none'}
- Minutes/day: ${minutesPerDay}
- Study days: ${Array.isArray(studyDays) ? studyDays.join(',') : ''}
- First language: ${firstLanguage}
- Bilingual plan: ${wantNative ? 'yes' : 'no'}
- Weak areas: ${(weakAreas||[]).join(', ') || 'unspecified'}
- Notes: ${notes || 'n/a'}

Rules:
- Respect study days; empty task list on non-study days.
- 3-5 tasks per study day; sum close to ${minutesPerDay} minutes.
- Strongly prioritize weak areas FIRST when composing each study day, then fill with other skills.
- Duration defaults 12 weeks if no deadline; otherwise DERIVE EXACT weeks from deadline so that the schedule ends on or just after the deadline date.
- Include 4-6 clear highlights and quick wins.
- Keep IELTS keywords (Task 1/2, cohesion, band, etc.) in English.
- ${wantNative ? 'Use bilingual titles; e.g., for Korean: 어휘: 12개 학술어 (Vocabulary: 12 academic words).' : 'Use concise English titles.'}
- Set meta.currentLevel using a rough guess from target (e.g., A2/B1/B2/C1).
- ${schema}`;

    const prompt = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3000
    } as const;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(prompt)
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`OpenAI error: ${t}`);
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    let plan: any = {};
    try { plan = JSON.parse(content); } catch { plan = {}; }

    // Minimal validation & backfill
    if (!plan || typeof plan !== 'object') plan = {};
    plan.durationWeeks = Number(plan.durationWeeks) || 12;
    plan.weekly = Array.isArray(plan.weekly) ? plan.weekly : [];
    plan.highlights = Array.isArray(plan.highlights) ? plan.highlights : [];
    plan.quickWins = Array.isArray(plan.quickWins) ? plan.quickWins : [];
    plan.meta = plan.meta || {};
    plan.meta.currentLevel = plan.meta.currentLevel || 'B1';
    plan.meta.currentApproxIELTS = Number(plan.meta.currentApproxIELTS || (Number(targetScore) - 1)) || 5.5;
    plan.meta.targetIELTS = Number(targetScore);
    plan.meta.dailyMinutes = Number(minutesPerDay);
    plan.meta.estimatedMonths = Number(plan.meta.estimatedMonths || Math.max(1, Math.round(plan.durationWeeks/4)));
    plan.meta.rationale = plan.meta.rationale || 'AI-generated without assessment, prioritized by weak areas and schedule.';
    plan.meta.targetDeadline = targetDeadline;
    plan.meta.startDateISO = plan.meta.startDateISO || new Date().toISOString();
    plan.meta.firstLanguage = firstLanguage;
    plan.meta.planNativeLanguage = wantNative ? 'yes' : 'no';

    // Ensure non-study days have empty tasks & align plan end to deadline if provided
    try {
      const setDays = new Set<number>(Array.isArray(studyDays) ? studyDays.map((n: any)=>Number(n)) : []);
      plan.weekly.forEach((w: any, wi: number) => {
        w.days = Array.isArray(w.days) ? w.days : [];
        w.days.forEach((d: any, di: number) => {
          if (!setDays.has((d.day ?? di) - 1)) d.tasks = [];
        });
      });
      if (targetDeadline) {
        const startISO = plan?.meta?.startDateISO || new Date().toISOString();
        const start = new Date(startISO);
        const deadline = new Date(targetDeadline);
        const totalDays = Math.max(1, Math.ceil((deadline.getTime() - start.getTime()) / (24*60*60*1000))) + 1;
        const neededWeeks = Math.max(1, Math.ceil(totalDays / 7));
        // extend or trim weekly to match
        if (plan.weekly.length < neededWeeks) {
          const lastWeek = plan.weekly[plan.weekly.length - 1] || { week: plan.weekly.length, days: [] };
          for (let w = plan.weekly.length; w < neededWeeks; w++) {
            plan.weekly.push({ week: w + 1, days: (lastWeek.days || []).map((d: any) => ({ day: d.day, tasks: Array.isArray(d.tasks) ? d.tasks : [] })) });
          }
        } else if (plan.weekly.length > neededWeeks) {
          plan.weekly = plan.weekly.slice(0, neededWeeks);
        }
        plan.durationWeeks = neededWeeks;
        plan.meta.estimatedMonths = Math.max(1, Math.round(neededWeeks/4));
      }
    } catch {}

    return new Response(JSON.stringify({ success: true, plan }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
