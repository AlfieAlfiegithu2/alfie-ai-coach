import type { Score } from '../assessment/scoring';

export type PlanTask = { title: string; minutes: number };
export type PlanDay = { day: number; tasks: PlanTask[] };
export type PlanWeek = { week: number; days: PlanDay[] };
export type Plan = {
  durationWeeks: number;
  weekly: PlanWeek[];
  highlights: string[];
  quickWins: string[];
};

const BASE_TASKS: Record<string, PlanTask[]> = {
  A1: [
    { title: 'Learn 20 new words (Anki/word list)', minutes: 20 },
    { title: 'Watch simple English YouTube (subtitles on)', minutes: 15 },
    { title: 'Pronunciation: repeat short sentences', minutes: 10 },
  ],
  A2: [
    { title: 'Learn 20 new words (themes)', minutes: 20 },
    { title: 'YouTube: Shorts or graded content', minutes: 15 },
    { title: 'Grammar bite (basic tenses)', minutes: 10 },
  ],
  B1: [
    { title: 'Learn 20 new words (example sentences)', minutes: 20 },
    { title: 'YouTube: topic summaries (EN captions)', minutes: 15 },
    { title: 'Read 1 short article and note key points', minutes: 15 },
  ],
  B2: [
    { title: 'Learn 20 new words (collocations)', minutes: 20 },
    { title: 'Podcast/YouTube without native subtitles', minutes: 20 },
    { title: 'Write 150 words about your day/topic', minutes: 15 },
  ],
  C1: [
    { title: 'Learn 20 advanced words (review weekly)', minutes: 20 },
    { title: 'Podcasts/news analysis (note unknowns)', minutes: 20 },
    { title: 'Write 200 words + self-edit', minutes: 20 },
  ],
};

function weekFromBand(band: Score['band']): PlanWeek {
  const tasks = BASE_TASKS[band];
  return {
    week: 1,
    days: Array.from({ length: 7 }).map((_, i) => ({ day: i + 1, tasks })),
  };
}

export function generateTemplatePlan(score: Score, goal: string): Plan {
  const durationWeeks = 2;
  const weekly: PlanWeek[] = [weekFromBand(score.band), weekFromBand(score.band)];
  const highlights = [
    `Focus: ${score.band} level fundamentals`,
    'Consistent daily input (listening/reading) + active output (speaking/writing)',
  ];
  const quickWins = [
    'Learn 20 words/day using spaced repetition',
    'Shadow a 5–10 min video daily',
    'Write a short paragraph and self-correct',
  ];
  return { durationWeeks, weekly, highlights, quickWins };
}


