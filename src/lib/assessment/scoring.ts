import type { AssessmentItem } from './items';

export type Score = {
  band: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  // Percent correct by skill (0-100)
  subs: { reading: number; listening: number; grammar: number; vocab: number };
  overallPct: number; // weighted overall percent (0-100)
};

export type Answers = Record<string, string>;

export function scoreAnswers(items: AssessmentItem[], answers: Answers): Score {
  let readingCorrect = 0, listeningCorrect = 0, grammarCorrect = 0, vocabCorrect = 0;
  let readingTotal = 0, listeningTotal = 0, grammarTotal = 0, vocabTotal = 0;

  for (const item of items) {
    if (!item.choices) continue;
    const isReading = item.id.includes('reading');
    const isListening = item.id.includes('listening');
    const isGrammar = item.id.includes('grammar');
    const isVocab = item.id.includes('vocab');
    const hasCorrect = item.choices.some(c => c.value === 1);
    if (!hasCorrect) continue; // skip unscored items

    const a = answers[item.id];
    const selected = item.choices.find(c => c.id === a);
    const isCorrect = (selected?.value ?? 0) === 1;

    if (isReading) {
      readingTotal += 1;
      if (isCorrect) readingCorrect += 1;
    } else if (isListening) {
      listeningTotal += 1;
      if (isCorrect) listeningCorrect += 1;
    } else if (isGrammar) {
      grammarTotal += 1;
      if (isCorrect) grammarCorrect += 1;
    } else if (isVocab) {
      vocabTotal += 1;
      if (isCorrect) vocabCorrect += 1;
    }
  }

  const toPct = (c: number, t: number) => (t > 0 ? Math.round((c / t) * 100) : 0);
  const readingPct = toPct(readingCorrect, readingTotal);
  const listeningPct = toPct(listeningCorrect, listeningTotal);
  const grammarPct = toPct(grammarCorrect, grammarTotal);
  const vocabPct = toPct(vocabCorrect, vocabTotal);

  // Weighted overall percentage (reading/listening 35% each; grammar/vocab 15% each)
  const overallPct = Math.round(
    readingPct * 0.35 + listeningPct * 0.35 + grammarPct * 0.15 + vocabPct * 0.15
  );

  let band: Score['band'];
  if (overallPct < 25) band = 'A1';
  else if (overallPct < 40) band = 'A2';
  else if (overallPct < 60) band = 'B1';
  else if (overallPct < 75) band = 'B2';
  else band = 'C1';

  return {
    band,
    subs: { reading: readingPct, listening: listeningPct, grammar: grammarPct, vocab: vocabPct },
    overallPct
  };
}


