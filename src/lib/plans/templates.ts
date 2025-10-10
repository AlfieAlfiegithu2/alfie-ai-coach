import type { Score } from '../assessment/scoring';
import { TASK_BANK, type TaskBankItem, selectTasks } from './taskBank';

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
    studyDays?: number[]; // 0=Sun..6=Sat
  };
};

// Pools used to diversify tasks and reduce repetition. Titles are prefixed by skill for UI coloring.
const poolsByBand = (band: Score['band']) => {
  const vocab: PlanTask[] = selectTasks('vocab', band, 3).map(toPlanTask);
  const listening: PlanTask[] = selectTasks('listening', band, 3).map(toPlanTask);
  const reading: PlanTask[] = selectTasks('reading', band, 3).map(toPlanTask);
  const grammar: PlanTask[] = selectTasks('grammar', band, 3).map(toPlanTask);
  const writing: PlanTask[] = selectTasks('writing', band, 3).map(toPlanTask);
  const speaking: PlanTask[] = selectTasks('speaking', band, 3).map(toPlanTask);

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

function toPlanTask(item: TaskBankItem): PlanTask {
  return { title: item.label, minutes: item.minutes };
}

function buildDailyTasks(
  band: Score['band'],
  dayIndex: number,
  minutes: number,
  prioritizedSkills: ReadonlyArray<'vocab' | 'listening' | 'reading' | 'grammar' | 'writing' | 'speaking'> = ['vocab','listening','reading','grammar','writing','speaking']
): PlanTask[] {
  // Deterministic RNG so similar learners get stable variety
  const rng = mulberry32(0x9E3779B1 ^ (dayIndex + 1));

  // Allow one-level-up items after ~2 weeks for gentle progression
  const levelOrder: Score['band'][] = ['A1','A2','B1','B2','C1'];
  const bandIdx = levelOrder.indexOf(band);
  const allowUp = dayIndex >= 14 ? 1 : 0;

  const allowed = new Set<Score['band']>(levelOrder.filter((_, i) => i <= Math.min(levelOrder.length - 1, bandIdx + allowUp)));

  const allBySkill: Record<string, PlanTask[]> = {
    vocab: TASK_BANK.filter(t => t.skill === 'vocab' && allowed.has(t.level)).map(toPlanTask),
    listening: TASK_BANK.filter(t => t.skill === 'listening' && allowed.has(t.level)).map(toPlanTask),
    reading: TASK_BANK.filter(t => t.skill === 'reading' && allowed.has(t.level)).map(toPlanTask),
    grammar: TASK_BANK.filter(t => t.skill === 'grammar' && allowed.has(t.level)).map(toPlanTask),
    writing: TASK_BANK.filter(t => t.skill === 'writing' && allowed.has(t.level)).map(toPlanTask),
    speaking: TASK_BANK.filter(t => t.skill === 'speaking' && allowed.has(t.level)).map(toPlanTask)
  } as any;

  // Start with prioritized skills (weakest first), then the rest in default order.
  const defaultOrder = ['vocab','listening','reading','grammar','writing','speaking'] as const;
  const seen = new Set<string>();
  const mergedOrder = [
    ...prioritizedSkills.filter((s) => defaultOrder.includes(s as any) && !seen.has(s) && (seen.add(s), true)),
    ...defaultOrder.filter((s) => !seen.has(s))
  ] as const;

  const tasks: PlanTask[] = [];
  const usedTitles = new Set<string>();
  let time = 0;

  // Fill by rotating skills, selecting randomly within each pool, avoiding duplicates and capping at 5 tasks
  let orderOffset = Math.floor(rng() * mergedOrder.length);
  while (time < minutes - 5 && tasks.length < 5) {
    const skill = mergedOrder[orderOffset % mergedOrder.length];
    orderOffset += 1;
    const pool = allBySkill[skill as keyof typeof allBySkill] || [];
    if (pool.length === 0) continue;
    const candidate = pool[Math.floor(rng() * pool.length)];
    if (usedTitles.has(candidate.title)) continue;
    if (time + candidate.minutes > Math.max(45, minutes)) continue;
    tasks.push(candidate);
    usedTitles.add(candidate.title);
    time += candidate.minutes;
  }

  // Ensure at least three tasks
  while (tasks.length < 3) {
    tasks.push({ title: 'Review: flashcards & error log', minutes: 10 });
  }
  return tasks;
}

// Fast deterministic PRNG
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

  // Localize plan content if requested
  const lang = (ctx.firstLanguage || '').toLowerCase();
  const wantNative = ctx.planNativeLanguage === 'yes' && lang && lang !== 'en' && lang !== 'english';

  // Build English defaults
  let highlights = [
    `Starting level: ${score.band} (≈ IELTS ${currentApprox.toFixed(1)})`,
    `Target: IELTS ${target.toFixed(1)}${deadlineText}`,
    `Study plan: ${recommendedDailyMinutes} min/day, ${studyDaysText}`,
    `Priority focus: ${weakestSkill} (${score.subs[weakestSkill]}%)`,
    ...languageSpecificTips.highlights
  ];

  let quickWins = [
    `Practice ${weakestSkill} for 15 min daily with immediate feedback`,
    'Record yourself speaking for 1 min daily, compare to model answers',
    'Learn 10 collocations per day from your weak areas',
    ...languageSpecificTips.quickWins
  ];

  // If native language requested, provide bilingual highlights/quick wins and bilingual task titles for major languages
  if (wantNative) {
    const L = {
      ko: {
        hl: [`현재 수준: ${score.band} (IELTS 약 ${currentApprox.toFixed(1)})`, `목표: IELTS ${target.toFixed(1)}${deadlineText ? '까지' : ''}`, `학습 계획: 하루 ${recommendedDailyMinutes}분, ${studyDaysText}`, `우선 집중 영역: ${weakestSkill} (${score.subs[weakestSkill]}%)`],
        qw: [`매일 ${weakestSkill} 15분 집중 연습 (즉시 피드백)`, '하루 1분 스피킹 녹음 → 모델 답안과 비교', '약점 분야에서 콜로케이션 10개 학습'],
        map: [[/^Vocabulary:/,'어휘:'],[/^Listening:/,'리스닝:'],[/^Reading:/,'리딩:'],[/^Grammar:/,'문법:'],[/^Writing:/,'라이팅:'],[/^Speaking:/,'스피킹:']] as Array<[RegExp,string]>
      },
      ja: {
        hl: [`現在レベル: ${score.band} (IELTS 約 ${currentApprox.toFixed(1)})`, `目標: IELTS ${target.toFixed(1)}${deadlineText ? 'まで' : ''}`, `学習計画: 1日 ${recommendedDailyMinutes}分, ${studyDaysText}`, `優先フォーカス: ${weakestSkill} (${score.subs[weakestSkill]}%)`],
        qw: [`毎日 ${weakestSkill} を15分練習（即時フィードバック）`, '1分スピーキングを録音してモデル解答と比較', '弱点分野のコロケーションを毎日10個'],
        map: [[/^Vocabulary:/,'語彙:'],[/^Listening:/,'リスニング:'],[/^Reading:/,'リーディング:'],[/^Grammar:/,'文法:'],[/^Writing:/,'ライティング:'],[/^Speaking:/,'スピーキング:']]
      },
      zh: {
        hl: [`当前水平: ${score.band} (雅思约 ${currentApprox.toFixed(1)})`, `目标: 雅思 ${target.toFixed(1)}${deadlineText ? '之前' : ''}`, `学习计划: 每天 ${recommendedDailyMinutes} 分钟, ${studyDaysText}`, `优先重点: ${weakestSkill} (${score.subs[weakestSkill]}%)`],
        qw: [`每天专注练习 ${weakestSkill} 15 分钟（即时反馈）`, '每天录1分钟口语并与范文比较', '弱项领域每天学习10个搭配'],
        map: [[/^Vocabulary:/,'词汇:'],[/^Listening:/,'听力:'],[/^Reading:/,'阅读:'],[/^Grammar:/,'语法:'],[/^Writing:/,'写作:'],[/^Speaking:/,'口语:']]
      },
      es: {
        hl: [`Nivel actual: ${score.band} (≈ IELTS ${currentApprox.toFixed(1)})`, `Meta: IELTS ${target.toFixed(1)}${deadlineText ? ' antes de la fecha' : ''}`, `Plan: ${recommendedDailyMinutes} min/día, ${studyDaysText}`, `Enfoque prioritario: ${weakestSkill} (${score.subs[weakestSkill]}%)`],
        qw: [`Practica ${weakestSkill} 15 min/día con feedback inmediato`, 'Graba 1 min de speaking y compáralo con un modelo', 'Aprende 10 colocaciones diarias de tus áreas débiles'],
        map: [[/^Vocabulary:/,'Vocabulario:'],[/^Listening:/,'Listening:'],[/^Reading:/,'Reading:'],[/^Grammar:/,'Gramática:'],[/^Writing:/,'Writing:'],[/^Speaking:/,'Speaking:']]
      },
      pt: { hl: [`Nível atual: ${score.band}`, `Meta: IELTS ${target.toFixed(1)}`, `Plano: ${recommendedDailyMinutes} min/dia, ${studyDaysText}`, `Foco prioritário: ${weakestSkill} (${score.subs[weakestSkill]}%)`], qw: [`Pratique ${weakestSkill} 15 min/dia com feedback imediato`, 'Grave 1 min de fala e compare com modelo', 'Aprenda 10 colocações por dia'], map: [[/^Vocabulary:/,'Vocabulário:'],[/^Listening:/,'Listening:'],[/^Reading:/,'Reading:'],[/^Grammar:/,'Gramática:'],[/^Writing:/,'Writing:'],[/^Speaking:/,'Speaking:']] },
      fr: { hl: [`Niveau actuel: ${score.band}`, `Objectif: IELTS ${target.toFixed(1)}`, `Plan: ${recommendedDailyMinutes} min/jour, ${studyDaysText}`, `Priorité: ${weakestSkill} (${score.subs[weakestSkill]}%)`], qw: [`Pratique ${weakestSkill} 15 min/jour avec feedback`, 'Enregistre 1 min d’expression orale et compare au modèle', 'Apprends 10 collocations par jour'], map: [[/^Vocabulary:/,'Vocabulaire:'],[/^Listening:/,'Listening:'],[/^Reading:/,'Reading:'],[/^Grammar:/,'Grammaire:'],[/^Writing:/,'Writing:'],[/^Speaking:/,'Speaking:']] },
      de: { hl: [`Aktuelles Niveau: ${score.band}`, `Ziel: IELTS ${target.toFixed(1)}`, `Plan: ${recommendedDailyMinutes} Min/Tag, ${studyDaysText}`, `Prioritätsfokus: ${weakestSkill} (${score.subs[weakestSkill]}%)`], qw: [`Täglich ${weakestSkill} 15 Min üben (sofortiges Feedback)`, 'Täglich 1 Min Sprechen aufnehmen und mit Modelllösung vergleichen', 'Lerne 10 Kollokationen pro Tag'], map: [[/^Vocabulary:/,'Wortschatz:'],[/^Listening:/,'Listening:'],[/^Reading:/,'Reading:'],[/^Grammar:/,'Grammatik:'],[/^Writing:/,'Writing:'],[/^Speaking:/,'Speaking:']] },
      ru: { hl: [`Текущий уровень: ${score.band}`, `Цель: IELTS ${target.toFixed(1)}`, `План: ${recommendedDailyMinutes} мин/день, ${studyDaysText}`, `Приоритет: ${weakestSkill} (${score.subs[weakestSkill]}%)`], qw: [`Ежедневно тренируйте ${weakestSkill} 15 минут`, 'Записывайте 1 минуту речи и сравнивайте с образцом', 'Учите 10 коллокаций в день'], map: [[/^Vocabulary:/,'Лексика:'],[/^Listening:/,'Аудирование:'],[/^Reading:/,'Чтение:'],[/^Grammar:/,'Грамматика:'],[/^Writing:/,'Письмо:'],[/^Speaking:/,'Говорение:']] },
      hi: { hl: [`वर्तमान स्तर: ${score.band}`, `लक्ष्य: IELTS ${target.toFixed(1)}`, `योजना: प्रतिदिन ${recommendedDailyMinutes} मिनट, ${studyDaysText}`, `प्राथमिक फोकस: ${weakestSkill} (${score.subs[weakestSkill]}%)`], qw: [`प्रतिदिन ${weakestSkill} 15 मिनट अभ्यास (तुरंत फीडबैक)`, '1 मिनट स्पीकिंग रिकॉर्ड करें और मॉडल से तुलना करें', 'कमज़ोर क्षेत्रों की 10 कोलोकेशन्स सीखें'], map: [[/^Vocabulary:/,'शब्दावली:'],[/^Listening:/,'Listening:'],[/^Reading:/,'Reading:'],[/^Grammar:/,'व्याकरण:'],[/^Writing:/,'Writing:'],[/^Speaking:/,'Speaking:']] },
      vi: { hl: [`Trình độ hiện tại: ${score.band}`, `Mục tiêu: IELTS ${target.toFixed(1)}`, `Kế hoạch: ${recommendedDailyMinutes} phút/ngày, ${studyDaysText}`, `Trọng tâm ưu tiên: ${weakestSkill} (${score.subs[weakestSkill]}%)`], qw: [`Luyện ${weakestSkill} 15 phút mỗi ngày (phản hồi ngay)`, 'Thu âm 1 phút nói và so sánh với mẫu', 'Học 10 collocation mỗi ngày'], map: [[/^Vocabulary:/,'Từ vựng:'],[/^Listening:/,'Listening:'],[/^Reading:/,'Reading:'],[/^Grammar:/,'Ngữ pháp:'],[/^Writing:/,'Writing:'],[/^Speaking:/,'Speaking:']] }
    } as const;

    const pack = (L as any)[lang];
    if (pack) {
      highlights = [...pack.hl, ...languageSpecificTips.highlights];
      quickWins = [...pack.qw, ...languageSpecificTips.quickWins];
      const localizeTitle = (t: string) => {
        let out = t;
        // Prefix localization (skill label)
        for (const [re, lbl] of pack.map) { if (re.test(out)) { out = out.replace(re, lbl); break; } }
        // Additional phrase localization for Korean for clarity
        if (lang === 'ko') {
          const replacements: Array<[RegExp, string]> = [
            [/\bTrue\/False\/Not Given\b/gi, '참/거짓/주어지지 않음'],
            [/\breference and inference\b/gi, '지시어/추론'],
            [/\bmatch headings to paragraphs\b/gi, '단락과 제목 매칭'],
            [/\bmap\/plan completion\b/gi, '지도/도면 완성'],
            [/\bparaphrase and gist \(short talk\)\b/gi, '패러프레이즈/요지 파악(짧은 담화)'],
            [/\bSection 1 details \(forms, dates, numbers\)\b/gi, '섹션 1 세부 정보(양식·날짜·숫자)'],
            [/\bquestions\b/gi, '문항'],
            [/\b12 academic words \+ 6 collocations\b/gi, '학술 어휘 12개 + 연어 6개'],
            [/\b10 collocations \(make 5 example sentences\)\b/gi, '연어 10개(예문 5개 작성)'],
            [/\breview deck \+ 8 new words\b/gi, '복습 카드 + 신규 단어 8개'],
            [/\barticles & prepositions \(12 items\)\b/gi, '관사·전치사(12문항)'],
            [/\btense control & SVA \(12 items\)\b/gi, '시제·주어-동사 일치(12문항)'],
            [/\bcomplex sentences & linkers \(10 items\)\b/gi, '복문·연결어(10문항)'],
            [/\bTask 1 outline \(data selection \+ comparisons\)\b/gi, 'Task 1 개요(데이터 선택+비교)'],
            [/\bTask 2 paragraph \(claim \+ reason \+ example\)\b/gi, 'Task 2 단락(주장+이유+예시)'],
            [/\b120‑word summary \+ cohesion markers\b/gi, '120단어 요약 + 응집 장치'],
            [/\bmimic & shadow 3 sentences \(pronunciation\)\b/gi, '따라 말하기 3문장(발음)']
          ];
          for (const [re, rep] of replacements) {
            out = out.replace(re, rep);
          }
          // En dash spacing to look clean in Korean
          out = out.replace(/\s–\s(\d+)\s*문항/gi, ' – $1문항');
        }
        return `${out} (${t})`;
      };
      weekly.forEach((w) => w.days.forEach((d) => { d.tasks = d.tasks.map((task) => ({ ...task, title: localizeTitle(task.title) })); }));
    }
  }

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
      planNativeLanguage: ctx.planNativeLanguage,
      studyDays
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


