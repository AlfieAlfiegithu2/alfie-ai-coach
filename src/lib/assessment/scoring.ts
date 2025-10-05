import type { AssessmentItem } from './items';

export type Score = {
  band: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  subs: { reading: number; listening: number; grammar: number; vocab: number };
};

export type Answers = Record<string, string>;

export function scoreAnswers(items: AssessmentItem[], answers: Answers): Score {
  let reading = 0, listening = 0, grammar = 0, vocab = 0;
  for (const item of items) {
    const a = answers[item.id];
    if (!a) continue;
    if (!item.choices) continue;
    const choice = item.choices.find(c => c.id === a);
    const val = choice?.value ?? 0;
    if (item.id.includes('reading')) reading += val;
    else if (item.id.includes('listening')) listening += val;
    else if (item.id.includes('grammar')) grammar += val;
    else if (item.id.includes('vocab')) vocab += val;
  }
  const total = reading + listening + grammar + vocab;
  let band: Score['band'] = 'A2';
  if (total <= 1) band = 'A1';
  else if (total === 2) band = 'A2';
  else if (total === 3) band = 'B1';
  else if (total === 4) band = 'B2';
  else band = 'C1';
  return { band, subs: { reading, listening, grammar, vocab } };
}


