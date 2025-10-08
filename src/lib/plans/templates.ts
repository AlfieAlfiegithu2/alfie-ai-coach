import type { Score } from '../assessment/scoring';

export type PlanTask = { title: string; minutes: number };
export type PlanDay = { day: number; tasks: PlanTask[] };
export type PlanWeek = { week: number; days: PlanDay[] };
export type Plan = {
  durationWeeks: number;
  weekly: PlanWeek[];
  highlights: string[];
  quickWins: string[];
  meta?: {
    currentLevel: Score['band'];
    currentApproxIELTS: number; // e.g., 6.5
    targetIELTS?: number | null;
    dailyMinutes?: number;
    estimatedMonths?: number;
    rationale?: string;
    targetDeadline?: string | null;
    startDateISO?: string;
    firstLanguage?: string;
    planNativeLanguage?: 'yes' | 'no';
  };
};

// Pools used to diversify tasks and reduce repetition. Titles are prefixed by skill for UI coloring.
const poolsByBand = (band: Score['band']) => {
  const vocab: PlanTask[] = [
    { title: 'Vocabulary: 12 academic words + 6 collocations', minutes: 20 },
    { title: 'Vocabulary: 10 collocations (make 5 example sentences)', minutes: 20 },
    { title: 'Vocabulary: review deck + 8 new words', minutes: 20 },
  ];
  const listening: PlanTask[] = [
    { title: 'Listening: Section 1 detail (forms/dates/numbers) 10 Q', minutes: 20 },
    { title: 'Listening: paraphrase/gist (short talk) 8 Q', minutes: 20 },
    { title: 'Listening: map/plan completion 10 Q', minutes: 20 },
  ];
  const reading: PlanTask[] = [
    { title: 'Reading: T/F/NG on short passage 8 Q', minutes: 20 },
    { title: 'Reading: reference & inference 10 Q', minutes: 20 },
    { title: 'Reading: headings/para matching 8 Q', minutes: 20 },
  ];
  const grammar: PlanTask[] = [
    { title: 'Grammar: articles & prepositions (12 items)', minutes: 15 },
    { title: 'Grammar: tense control & SVA (12 items)', minutes: 15 },
    { title: 'Grammar: complex sentences & linkers (10 items)', minutes: 15 },
  ];
  const writing: PlanTask[] = [
    { title: 'Writing: Task 1 outline (data selection + comparisons)', minutes: 20 },
    { title: 'Writing: Task 2 paragraph (claim + reason + example)', minutes: 20 },
    { title: 'Writing: 120‑word summary + cohesion markers', minutes: 20 },
  ];
  const speaking: PlanTask[] = [
    { title: 'Speaking: Part 1 (2 prompts, 40s) + feedback highlights', minutes: 10 },
    { title: 'Speaking: Part 2 cue card (prep 15s + speak 40s)', minutes: 15 },
    { title: 'Speaking: mimic & shadow 3 sentences (pronunciation)', minutes: 10 },
  ];

  // Adjust emphasis per band lightly
  const emphasize = (arr: PlanTask[], more: number): PlanTask[] => arr.concat(arr.slice(0, more));
  switch (band) {
    case 'A1':
    case 'A2':
      return {
        vocab: emphasize(vocab, 1),
        listening: emphasize(listening, 1),
        reading,
        grammar: emphasize(grammar, 1),
        writing,
        speaking,
      };
    case 'B1':
      return { vocab, listening, reading, grammar, writing, speaking };
    case 'B2':
    case 'C1':
      return {
        vocab,
        listening,
        reading: emphasize(reading, 1),
        grammar,
        writing: emphasize(writing, 1),
        speaking,
      };
  }
};

function pick<T>(arr: T[], index: number): T { return arr[index % arr.length]; }

function buildDailyTasks(
  band: Score['band'],
  dayIndex: number,
  minutes: number,
  prioritizedSkills: ReadonlyArray<'vocab' | 'listening' | 'reading' | 'grammar' | 'writing' | 'speaking'> = ['vocab','listening','reading','grammar','writing','speaking']
): PlanTask[] {
  const pools = poolsByBand(band);
  // Start with prioritized skills (weakest first), then fill any remaining in the default order.
  const defaultOrder = ['vocab','listening','reading','grammar','writing','speaking'] as const;
  const seen = new Set<string>();
  const mergedOrder = [
    ...prioritizedSkills.filter((s) => defaultOrder.includes(s as any) && !seen.has(s) && (seen.add(s), true)),
    ...defaultOrder.filter((s) => !seen.has(s))
  ] as const;
  const tasks: PlanTask[] = [];
  let time = 0;
  // Rotate start skill by day for variety
  const start = dayIndex % mergedOrder.length;
  for (let i = 0; i < mergedOrder.length; i++) {
    const skill = mergedOrder[(start + i) % mergedOrder.length];
    const pool = pools[skill];
    const task = pick(pool, dayIndex + i);
    if (time + task.minutes <= Math.max(45, minutes)) {
      tasks.push(task);
      time += task.minutes;
    }
    if (time >= minutes - 10) break;
  }
  // Ensure at least three tasks
  while (tasks.length < 3) {
    tasks.push({ title: 'Review: flashcards & error log', minutes: 10 });
  }
  return tasks;
}

type PlanContext = { targetScore?: number | null; targetDeadline?: string | null; studyDaysJson?: string; firstLanguage?: string; planNativeLanguage?: 'yes' | 'no' };

function ieltsFromPct(pct: number): number {
  if (pct < 25) return 3.5;
  if (pct < 40) return 4.5;
  if (pct < 56) return 5.5;
  if (pct < 70) return 6.5;
  if (pct < 86) return 7.5;
  return 8.0;
}

// Compute required daily minutes to hit target by deadline based on band gap
function requiredDailyMinutes(currentApprox: number, target: number, weeksAvailable: number): number {
  const halfBandSteps = Math.max(0, Math.ceil((target - currentApprox) * 2));
  if (halfBandSteps === 0) return 30; // maintain
  // Baseline: 4 weeks per 0.5 band at ~60 min/day -> total minutes per step
  const minutesPerStepAt60 = 4 * 7 * 60; // 1680
  const totalMinutesNeeded = halfBandSteps * minutesPerStepAt60;
  const minutesPerWeek = totalMinutesNeeded / Math.max(1, weeksAvailable);
  const perDay = Math.ceil(minutesPerWeek / 7);
  return Math.min(180, Math.max(30, perDay));
}

export function generateTemplatePlan(score: Score, goal: string, ctx: PlanContext = {}): Plan {
  const currentApprox = ieltsFromPct((score as any).overallPct ?? 50);
  const target = goal?.toLowerCase() === 'ielts' ? (ctx.targetScore ?? 7.0) : (ctx.targetScore ?? currentApprox + 1);
  // Determine available weeks from deadline (default 12 weeks if none)
  let durationWeeks = 12;
  if (ctx.targetDeadline) {
    const deadline = new Date(ctx.targetDeadline);
    const now = new Date();
    const diffWeeks = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    if (isFinite(diffWeeks) && diffWeeks > 0) durationWeeks = diffWeeks;
  }
  // Compute required daily minutes to close the band gap within durationWeeks
  let recommendedDailyMinutes = requiredDailyMinutes(currentApprox, target, durationWeeks);
  // If no deadline, cap to reasonable 26 weeks
  // Cap to 26 weeks for ~6 months; still allows shorter/longer as needed
  durationWeeks = Math.min(26, durationWeeks);
  const estimatedMonths = Math.max(1, Math.round(durationWeeks / 4));

  // Respect selected study days if provided. Ensure numeric indices (0=Sun..6=Sat).
  const studyDays: number[] = (() => {
    try {
      const raw = JSON.parse(ctx.studyDaysJson || '[]');
      if (Array.isArray(raw)) return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      return [];
    } catch { return []; }
  })();

  // Build prioritized skills order from weakest sub-scores (lowest first).
  const subs = score.subs || { reading: 50, listening: 50, grammar: 50, vocab: 50, writing: 50 } as Score['subs'];
  const priority = (Object.entries(subs) as Array<[keyof typeof subs, number]>)
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => (k === 'reading' || k === 'listening' || k === 'grammar' || k === 'vocab' || k === 'writing' ? k : 'speaking'));
  // Map subs keys to plan skill keys
  const toPlanKey = (k: string): any => ({ vocab: 'vocab', listening: 'listening', reading: 'reading', grammar: 'grammar', writing: 'writing' } as any)[k] ?? 'speaking';
  const prioritizedSkills = priority.map((k) => toPlanKey(k)) as ReadonlyArray<'vocab' | 'listening' | 'reading' | 'grammar' | 'writing' | 'speaking'>;

  // Build weekly schedule honoring study days (default: all days)
  const weekly: PlanWeek[] = Array.from({ length: durationWeeks }).map((_, wi) => ({
    week: wi + 1,
    days: Array.from({ length: 7 }).map((__, di) => ({
      day: di + 1,
      tasks: (studyDays.length === 0 || studyDays.includes(di))
        ? buildDailyTasks(score.band, wi * 7 + di, recommendedDailyMinutes, prioritizedSkills)
        : []
    }))
  }));

  // Get language-specific tips based on first language
  const languageSpecificTips = getLanguageSpecificTips(ctx.firstLanguage, score);
  
  // Get weakest skill for focused feedback
  const weakestSkill = (Object.entries(score.subs).sort((a,b)=>a[1]-b[1])[0]||[])[0] ?? 'mixed';
  const studyDaysText = studyDays.length > 0 ? `${studyDays.length} days/week` : 'daily';
  const deadlineText = ctx.targetDeadline 
    ? ` by ${new Date(ctx.targetDeadline).toLocaleDateString()}` 
    : '';

  const highlights = [
    `Starting level: ${score.band} (≈ IELTS ${currentApprox.toFixed(1)})`,
    `Target: IELTS ${target.toFixed(1)}${deadlineText}`,
    `Study plan: ${recommendedDailyMinutes} min/day, ${studyDaysText}`,
    `Priority focus: ${weakestSkill} (${score.subs[weakestSkill]}%)`,
    ...languageSpecificTips.highlights
  ];

  const quickWins = [
    `Practice ${weakestSkill} for 15 min daily with immediate feedback`,
    'Record yourself speaking for 1 min daily, compare to model answers',
    'Learn 10 collocations per day from your weak areas',
    ...languageSpecificTips.quickWins
  ];

  const nativeLanguageNote = ctx.planNativeLanguage === 'yes' && ctx.firstLanguage
    ? `Note: Double-click any word during practice for ${ctx.firstLanguage} translation`
    : undefined;

  return {
    durationWeeks,
    weekly,
    highlights: nativeLanguageNote ? [nativeLanguageNote, ...highlights] : highlights,
    quickWins,
    meta: {
      currentLevel: score.band,
      currentApproxIELTS: currentApprox,
      targetIELTS: target,
      dailyMinutes: recommendedDailyMinutes,
      estimatedMonths,
      rationale: `Personalized for ${ctx.firstLanguage || 'English learner'} studying ${studyDaysText}, targeting ${(target - currentApprox).toFixed(1)} band improvement`,
      targetDeadline: ctx.targetDeadline ?? null,
      startDateISO: new Date().toISOString(),
      firstLanguage: ctx.firstLanguage,
      planNativeLanguage: ctx.planNativeLanguage
    }
  };
}

// Get language-specific tips and focus areas
function getLanguageSpecificTips(firstLanguage: string | undefined, score: Score): { highlights: string[]; quickWins: string[] } {
  if (!firstLanguage) return { highlights: [], quickWins: [] };

  const languageChallenges: Record<string, { highlights: string[]; quickWins: string[] }> = {
    'Chinese': {
      highlights: ['Focus on articles (a/an/the) and plural forms', 'Practice linking words in speaking'],
      quickWins: ['Master 20 common article patterns', 'Record yourself using linking words (however, therefore, etc.)']
    },
    'Arabic': {
      highlights: ['Focus on word order and tense consistency', 'Practice vowel sounds in pronunciation'],
      quickWins: ['Drill subject-verb-object patterns daily', 'Shadow native speakers for vowel clarity']
    },
    'Spanish': {
      highlights: ['Focus on false friends and phrasal verbs', 'Practice writing without literal translation'],
      quickWins: ['Learn 10 phrasal verbs weekly', 'Write summaries using English thought patterns']
    },
    'French': {
      highlights: ['Focus on false cognates and prepositions', 'Practice formal vs. informal register'],
      quickWins: ['Master 15 key preposition differences', 'Study IELTS register requirements']
    },
    'Japanese': {
      highlights: ['Focus on articles and subject-verb agreement', 'Practice direct communication style'],
      quickWins: ['Drill article usage in context', 'Practice stating opinions directly']
    },
    'Korean': {
      highlights: ['Focus on articles and relative clauses', 'Practice paragraph structure'],
      quickWins: ['Master basic article rules', 'Outline before writing to improve coherence']
    },
    'Russian': {
      highlights: ['Focus on articles and continuous tenses', 'Practice natural word stress'],
      quickWins: ['Learn article patterns in common contexts', 'Shadow audio for natural rhythm']
    },
    'Portuguese': {
      highlights: ['Focus on false friends and phrasal verbs', 'Practice question formation'],
      quickWins: ['Study 10 misleading cognates weekly', 'Drill question word order']
    },
    'Hindi': {
      highlights: ['Focus on articles and prepositions', 'Practice writing complex sentences'],
      quickWins: ['Master article usage rules', 'Study compound-complex sentence patterns']
    },
    'Vietnamese': {
      highlights: ['Focus on verb tenses and word order', 'Practice consonant clusters'],
      quickWins: ['Drill past/present/future markers', 'Practice consonant combinations daily']
    }
  };

  return languageChallenges[firstLanguage] || { 
    highlights: [`Tailored for ${firstLanguage} speakers`], 
    quickWins: ['Focus on areas where your language differs from English'] 
  };
}


