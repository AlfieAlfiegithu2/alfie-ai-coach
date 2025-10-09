import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Global in-memory cache for study plans
const globalCache = new Map();

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const {
      targetScore = 7.0,
      targetDeadline = null,
      minutesPerDay = 60,
      studyDays = [1,2,3,4,5], // 0=Sun..6=Sat
      firstLanguage = 'en',
      planNativeLanguage = 'no', // 'yes'|'no'
      weakAreas = [], // ['vocab','listening','reading','grammar','writing','speaking']
      notes = '',
      provider = 'deepseek' // 'deepseek' | 'gemini'
    } = body || {};

    // Choose provider sanely based on available API keys
    let chosenProvider: 'deepseek' | 'gemini' = (provider as any) === 'gemini' ? 'gemini' : 'deepseek';
    if (chosenProvider === 'gemini' && !GEMINI_API_KEY && DEEPSEEK_API_KEY) chosenProvider = 'deepseek';
    if (chosenProvider === 'deepseek' && !DEEPSEEK_API_KEY && GEMINI_API_KEY) chosenProvider = 'gemini';
    if (!DEEPSEEK_API_KEY && !GEMINI_API_KEY) {
      throw new Error('No AI provider configured: set GEMINI_API_KEY or DEEPSEEK_API_KEY');
    }

    // Normalize language code/names
    const lang = String(firstLanguage || 'en').toLowerCase();
    const normalizeLang = (l: string) => {
      const m: Record<string, string> = {
        'zh-cn': 'zh', 'zh-hans': 'zh', 'zh-hant': 'zh', 'cn': 'zh', 'chinese': 'zh', '中文': 'zh',
        'ko-kr': 'ko', 'korean': 'ko', '한국어': 'ko',
        'ja-jp': 'ja', 'japanese': 'ja', '日本語': 'ja',
        'es-es': 'es', 'spanish': 'es', 'español': 'es',
        'pt-pt': 'pt', 'portuguese': 'pt', 'português': 'pt',
        'fr-fr': 'fr', 'french': 'fr', 'français': 'fr',
        'de-de': 'de', 'german': 'de', 'deutsch': 'de',
        'ru-ru': 'ru', 'russian': 'ru', 'русский': 'ru',
        'hi-in': 'hi', 'hindi': 'hi', 'हिन्दी': 'hi',
        'vi-vn': 'vi', 'vietnamese': 'vi', 'tiếng việt': 'vi'
      };
      return m[l] || l;
    };
    const firstLangNorm = normalizeLang(lang);

    // Create cache key for similar requests
    const cacheKey = `plan_${chosenProvider}_${targetScore}_${minutesPerDay}_${studyDays.join(',')}_${firstLangNorm}_${planNativeLanguage}_${weakAreas.join(',')}_${targetDeadline || 'none'}`;
    console.log('🔍 Plan cache key:', cacheKey.substring(0, 50) + '...');

    const wantNative = String(planNativeLanguage) === 'yes' && firstLangNorm && firstLangNorm !== 'en';
    
    console.log('🌍 Language settings:', {
      firstLanguage: firstLangNorm,
      planNativeLanguage,
      wantNative,
      isChinese: firstLangNorm === 'zh'
    });

    // Clear cache for language changes to ensure fresh generation
    if (wantNative && firstLanguage) {
      console.log(`🔄 Generating fresh plan for ${firstLanguage} language`);
      // Don't use cache for language-specific plans to ensure proper localization
    } else if (globalCache.has(cacheKey)) {
      console.log('⚡ Using cached plan');
      const cachedPlan = globalCache.get(cacheKey);
      return new Response(JSON.stringify({ success: true, plan: cachedPlan, cached: true }), { 
        headers: { ...cors, 'Content-Type': 'application/json' } 
      });
    }

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

    const system = `You are an IELTS coach. Create a concise, practical study plan. Keep IELTS keywords in ENGLISH. 

CRITICAL: For bilingual output (when firstLanguage is Chinese/Korean/Japanese/etc), you MUST:
- Use bilingual task titles: "中文标题 (English keyword)"
- Use bilingual highlights and quickWins
- Example: "词汇: 12个学术词汇 (Vocabulary: 12 academic words)"

Focus on 3-5 tasks per study day, prioritize weak areas first.`;

    const user = `Create IELTS study plan:
Target: ${Number(targetScore).toFixed(1)} | Deadline: ${targetDeadline || 'none'} | Daily: ${minutesPerDay}min | Days: ${Array.isArray(studyDays) ? studyDays.join(',') : ''} | Lang: ${firstLangNorm} | Bilingual: ${wantNative ? 'yes' : 'no'} | Weak: ${(weakAreas||[]).join(', ') || 'none'}

${wantNative && firstLangNorm === 'zh' ? `
MANDATORY CHINESE OUTPUT:
- Task titles MUST be: "中文标题 (English keyword)"
- Highlights MUST be: "当前水平: A2 (雅思约4.5)" format
- QuickWins MUST be: "每天专注练习语法15分钟（即时反馈）" format
- Example task: "词汇: 12个学术词汇 (Vocabulary: 12 academic words)"
- Example highlight: "目标: 雅思7.0 • 每日学习约60分钟"
- Example quickWin: "每天模仿学术音频5-10分钟（发音+节奏）"
` : ''}

Rules: Empty tasks on non-study days. 3-5 tasks/day totaling ~${minutesPerDay}min. Prioritize weak areas first. 12 weeks default or match deadline. Keep IELTS terms in English. ${wantNative ? 'Bilingual titles: "Local (English)"' : 'English titles only'}. ${schema}`;

    const prompt = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.1, // Lower temperature for faster, more consistent responses
      max_tokens: 2000, // Reduced token limit for faster generation
      stream: false
    } as const;

    console.log('🚀 Starting study plan generation...');
    const startTime = Date.now();

    async function callDeepSeek() {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`DeepSeek error: ${t}`);
      }
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content || '{}';
    }

    async function callGemini() {
      if (!GEMINI_API_KEY) throw new Error('Gemini not configured');
      const mergedText = `${prompt.messages[0].content}\n\n${prompt.messages[1].content}`;
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: mergedText }]}],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1800, responseMimeType: 'application/json', response_mime_type: 'application/json' }
        })
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Gemini error: ${t}`);
      }
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return text;
    }

    let content = '{}';
    try {
      if (chosenProvider === 'gemini') {
        content = await callGemini();
      } else {
        content = await callDeepSeek();
      }
    } catch (primaryErr) {
      console.warn('Primary provider failed, attempting fallback...', String(primaryErr));
      try {
        if (chosenProvider === 'gemini') {
          if (!DEEPSEEK_API_KEY) throw primaryErr;
          content = await callDeepSeek();
        } else {
          if (!GEMINI_API_KEY) throw primaryErr;
          content = await callGemini();
        }
      } catch (fallbackErr) {
        const generationTime = Date.now() - startTime;
        console.log(`⏱️ Plan generation failed after ${generationTime}ms`);
        throw fallbackErr;
      }
    }

    const generationTime = Date.now() - startTime;
    console.log(`⏱️ Plan generation finished in ${generationTime}ms (provider: ${chosenProvider})`);
    let plan: any = {};
    function parsePlanSafely(text: string) {
      try { return JSON.parse(text); } catch {}
      if (typeof text === 'string') {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) { try { return JSON.parse(m[0]); } catch {} }
      }
      return {};
    }
    plan = parsePlanSafely(content);

    // Minimal validation & backfill
    if (!plan || typeof plan !== 'object' || !Array.isArray(plan.weekly)) {
      console.warn('⚠️ AI returned invalid plan JSON. Building deterministic fallback schedule.');
      const days = Array.isArray(studyDays) ? studyDays.map((n: any)=>Number(n)) : [1,2,3,4,5];
      const startISO = new Date().toISOString();
      const durationWeeks = Math.max(1, Math.round(((targetDeadline ? (new Date(targetDeadline).getTime() - Date.now()) : (84*24*60*60*1000)))/(7*24*60*60*1000)));
      const basicTasks = (weakAreas.length ? weakAreas : ['vocab','grammar','listening','reading','writing','speaking']).slice(0,4);
      const toTitle = (w: string) => ({
        vocab: 'Vocabulary: 12 academic words',
        grammar: 'Grammar: articles & prepositions (12 items)',
        listening: 'Listening: Section 1 detail (forms/dates/numbers) 10 Q',
        reading: 'Reading: headings/para matching 8 Q',
        writing: 'Writing: Task 2 paragraph (claim + reason + example)',
        speaking: 'Speaking: mimic & shadow 3 sentences (pronunciation)'
      } as any)[w] || 'Study 20 minutes';
      const pack = basicTasks.map((w) => ({ title: toTitle(w as string), minutes: Math.max(20, Math.min(90, Math.round(Number(minutesPerDay)/basicTasks.length))) }));
      const weekly = Array.from({ length: durationWeeks }).map((_, wi) => ({
        week: wi + 1,
        days: Array.from({ length: 7 }).map((__, di) => ({
          day: di + 1,
          tasks: days.includes(di) ? pack : []
        }))
      }));
      plan = {
        durationWeeks,
        weekly,
        highlights: [
          `Starting level ≈ ${Math.max(1, Math.min(9, Number(targetScore) - 2)).toFixed(1)}`,
          `Target IELTS ${Number(targetScore).toFixed(1)} • Daily study ~${minutesPerDay} min`,
          `Estimated timeline: ~${Math.max(1, Math.round(durationWeeks/4))} month(s)`
        ],
        quickWins: [
          'Shadow 5–10 min academic audio daily (pronunciation + rhythm)',
          'Target weak subskills with 10 focused items/day',
          'Weekly mini‑mock to measure progress'
        ],
        meta: {
          currentLevel: 'B1',
          currentApproxIELTS: Math.max(4, Number(targetScore) - 1),
          targetIELTS: Number(targetScore),
          dailyMinutes: Number(minutesPerDay),
          estimatedMonths: Math.max(1, Math.round(durationWeeks/4)),
          rationale: 'Fallback plan generated deterministically due to AI output issue.',
          targetDeadline,
          startDateISO: startISO,
          firstLanguage: firstLangNorm,
          planNativeLanguage: wantNative ? 'yes' : 'no'
        }
      };
    }
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
    plan.meta.firstLanguage = firstLangNorm;
    plan.meta.planNativeLanguage = wantNative ? 'yes' : 'no';

    // Ensure non-study days have empty tasks & align plan end to deadline if provided
    try {
      const setDays = new Set<number>(Array.isArray(studyDays) ? studyDays.map((n: any)=>Number(n)) : []);
      plan.weekly.forEach((w: any, wi: number) => {
        w.days = Array.isArray(w.days) ? w.days : [];
        w.days.forEach((d: any, di: number) => {
          const dayIndex = typeof d.day === 'number' && isFinite(d.day)
            ? Math.max(0, Math.min(6, Number(d.day) - 1))
            : di; // fallback to index 0..6
          if (!setDays.has(dayIndex)) d.tasks = [];
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

    // Cache the generated plan (only for non-language-specific plans)
    if (!wantNative) {
      globalCache.set(cacheKey, plan);
      console.log('💾 Plan cached for future use');
    } else {
      console.log(`🌍 Generated fresh ${firstLanguage} plan (not cached for language diversity)`);
    }

    return new Response(JSON.stringify({ success: true, plan }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as any).message || e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
