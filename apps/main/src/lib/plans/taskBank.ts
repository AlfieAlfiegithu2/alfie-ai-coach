export type TaskBankItem = {
  id: string;
  skill: 'vocab' | 'listening' | 'reading' | 'grammar' | 'writing' | 'speaking';
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  minutes: number; // canonical minutes
  label: string; // clear, student-facing English label (no abbreviations)
  subskill?: string; // e.g., inference, gist, TFNG
  tags?: string[];
};

// High‑quality, vetted tasks. Keep items atomic and measurable. Labels must avoid shorthand like "8 Q".
export const TASK_BANK: readonly TaskBankItem[] = [
  // Vocabulary
  { id: 'vocab-academic-12', skill: 'vocab', level: 'B1', minutes: 20, label: 'Vocabulary: learn 12 academic words with collocations', subskill: 'academic', tags: ['lexis','collocations'] },
  { id: 'vocab-collocations-10', skill: 'vocab', level: 'B1', minutes: 20, label: 'Vocabulary: 10 collocations — write 5 example sentences', subskill: 'collocations', tags: ['production'] },
  { id: 'vocab-review-8', skill: 'vocab', level: 'A2', minutes: 20, label: 'Vocabulary: review deck and add 8 new words', subskill: 'review', tags: ['spaced-repetition'] },
  { id: 'vocab-word-formation-12', skill: 'vocab', level: 'B2', minutes: 20, label: 'Vocabulary: word formation (noun/verb/adjective/adverb) — 12 items', subskill: 'word-formation' },
  { id: 'vocab-synonym-precision-10', skill: 'vocab', level: 'B2', minutes: 20, label: 'Vocabulary: synonym precision in context — 10 sentences', subskill: 'precision' },
  { id: 'vocab-error-log-15', skill: 'vocab', level: 'B1', minutes: 15, label: 'Vocabulary: review error log and rebuild 15 cards', subskill: 'review' },
  { id: 'vocab-a1-picture-10', skill: 'vocab', level: 'A1', minutes: 15, label: 'Vocabulary: picture cues — 10 new words', subskill: 'foundation' },
  { id: 'vocab-c1-academic-phrasing-12', skill: 'vocab', level: 'C1', minutes: 20, label: 'Vocabulary: academic phrasing — replace 12 informal phrases', subskill: 'register' },

  // Listening
  { id: 'list-section1-details-10', skill: 'listening', level: 'A2', minutes: 20, label: 'Listening: Section 1 details (forms, dates, numbers) — 10 questions', subskill: 'detail' },
  { id: 'list-paraphrase-gist-8', skill: 'listening', level: 'B1', minutes: 20, label: 'Listening: paraphrase and gist (short talk) — 8 questions', subskill: 'gist' },
  { id: 'list-map-plan-10', skill: 'listening', level: 'B1', minutes: 20, label: 'Listening: map/plan completion — 10 questions', subskill: 'visual' },
  { id: 'list-note-completion-10', skill: 'listening', level: 'B1', minutes: 20, label: 'Listening: note completion — 10 questions', subskill: 'note' },
  { id: 'list-sentence-completion-10', skill: 'listening', level: 'B1', minutes: 20, label: 'Listening: sentence completion — 10 questions', subskill: 'sentence' },
  { id: 'list-mc-gist-8', skill: 'listening', level: 'B2', minutes: 20, label: 'Listening: multiple choice (section 2 gist) — 8 questions', subskill: 'mcq' },
  { id: 'list-a1-words-numbers-10', skill: 'listening', level: 'A1', minutes: 15, label: 'Listening: words and numbers dictation — 10 items', subskill: 'dictation' },
  { id: 'list-c1-lecture-structure-8', skill: 'listening', level: 'C1', minutes: 20, label: 'Listening: lecture structure and signposting — 8 questions', subskill: 'structure' },

  // Reading
  { id: 'read-tfng-8', skill: 'reading', level: 'A2', minutes: 20, label: 'Reading: True/False/Not Given (short passage) — 8 questions', subskill: 'TFNG' },
  { id: 'read-reference-inference-10', skill: 'reading', level: 'B1', minutes: 20, label: 'Reading: reference and inference — 10 questions', subskill: 'inference' },
  { id: 'read-headings-paras-8', skill: 'reading', level: 'B1', minutes: 20, label: 'Reading: match headings to paragraphs — 8 questions', subskill: 'matching-headings' },
  { id: 'read-summary-completion-8', skill: 'reading', level: 'B1', minutes: 20, label: 'Reading: summary completion — 8 questions', subskill: 'summary' },
  { id: 'read-matching-information-10', skill: 'reading', level: 'B2', minutes: 20, label: 'Reading: matching information — 10 questions', subskill: 'matching-info' },
  { id: 'read-mc-single-8', skill: 'reading', level: 'B2', minutes: 20, label: 'Reading: multiple choice (single answer) — 8 questions', subskill: 'mcq' },
  { id: 'read-a1-sentences-10', skill: 'reading', level: 'A1', minutes: 15, label: 'Reading: sentence ordering — 10 items', subskill: 'ordering' },
  { id: 'read-c1-paraphrase-12', skill: 'reading', level: 'C1', minutes: 20, label: 'Reading: paraphrase complex sentences — 12 items', subskill: 'paraphrase' },

  // Grammar
  { id: 'gram-articles-prep-12', skill: 'grammar', level: 'A2', minutes: 15, label: 'Grammar: articles and prepositions — 12 items', subskill: 'articles' },
  { id: 'gram-tense-sva-12', skill: 'grammar', level: 'B1', minutes: 15, label: 'Grammar: tense control and subject–verb agreement — 12 items', subskill: 'tense' },
  { id: 'gram-complex-linkers-10', skill: 'grammar', level: 'B1', minutes: 15, label: 'Grammar: complex sentences and linking words — 10 items', subskill: 'linkers' },
  { id: 'gram-conditionals-10', skill: 'grammar', level: 'B1', minutes: 15, label: 'Grammar: conditionals (0, 1st, 2nd) — 10 items', subskill: 'conditionals' },
  { id: 'gram-relative-clauses-10', skill: 'grammar', level: 'B1', minutes: 15, label: 'Grammar: relative clauses — 10 items', subskill: 'relative-clauses' },
  { id: 'gram-modifiers-12', skill: 'grammar', level: 'B2', minutes: 15, label: 'Grammar: modifiers and parallel structure — 12 items', subskill: 'modifiers' },
  { id: 'gram-a1-simple-present-12', skill: 'grammar', level: 'A1', minutes: 15, label: 'Grammar: simple present with be/do — 12 items', subskill: 'simple-present' },
  { id: 'gram-c1-subordination-12', skill: 'grammar', level: 'C1', minutes: 15, label: 'Grammar: subordination and clause packaging — 12 items', subskill: 'advanced' },

  // Writing
  { id: 'write-task1-outline', skill: 'writing', level: 'B1', minutes: 20, label: 'Writing: Task 1 outline (select key data and comparisons)', subskill: 'task1' },
  { id: 'write-task2-paragraph', skill: 'writing', level: 'B1', minutes: 20, label: 'Writing: Task 2 paragraph (claim + reason + example)', subskill: 'task2' },
  { id: 'write-summary-120', skill: 'writing', level: 'B1', minutes: 20, label: 'Writing: 120‑word summary using cohesion markers', subskill: 'cohesion' },
  { id: 'write-task2-plan-12', skill: 'writing', level: 'B1', minutes: 20, label: 'Writing: Task 2 plan — brainstorm and 12‑minute outline', subskill: 'planning' },
  { id: 'write-intro-paraphrase-4', skill: 'writing', level: 'B1', minutes: 20, label: 'Writing: introduce and paraphrase the question — 4 versions', subskill: 'paraphrase' },
  { id: 'write-coherence-linking-15', skill: 'writing', level: 'B2', minutes: 20, label: 'Writing: coherence — refine linking devices in a paragraph (15 edits)', subskill: 'coherence' },
  { id: 'write-a1-sentences-12', skill: 'writing', level: 'A1', minutes: 15, label: 'Writing: build 12 simple sentences with be/have', subskill: 'foundation' },
  { id: 'write-c1-hedging-12', skill: 'writing', level: 'C1', minutes: 20, label: 'Writing: academic hedging and stance — 12 rewrites', subskill: 'register' },

  // Speaking
  { id: 'speak-part1-2prompts', skill: 'speaking', level: 'A2', minutes: 10, label: 'Speaking: Part 1 — answer 2 prompts (40 seconds) with feedback', subskill: 'part1' },
  { id: 'speak-part2-cuecard', skill: 'speaking', level: 'B1', minutes: 15, label: 'Speaking: Part 2 cue card (prep 15s + speak 40s)', subskill: 'part2' },
  { id: 'speak-mimic-shadow-3', skill: 'speaking', level: 'A2', minutes: 10, label: 'Speaking: mimic and shadow 3 sentences (pronunciation)', subskill: 'pronunciation' },
  { id: 'speak-part3-followups-6', skill: 'speaking', level: 'B1', minutes: 12, label: 'Speaking: Part 3 — 6 follow‑up questions with reasons and examples', subskill: 'part3' },
  { id: 'speak-intonation-stress-10', skill: 'speaking', level: 'B1', minutes: 10, label: 'Speaking: intonation and word stress — record and compare 10 lines', subskill: 'pronunciation' },
  { id: 'speak-a1-introduce-yourself', skill: 'speaking', level: 'A1', minutes: 10, label: 'Speaking: introduce yourself — 6 lines with recording', subskill: 'foundation' },
  { id: 'speak-c1-issue-stance-10', skill: 'speaking', level: 'C1', minutes: 15, label: 'Speaking: take a stance on an issue — 10 lines with hedging', subskill: 'fluency' },
];

export function selectTasks(
  skill: TaskBankItem['skill'],
  level: TaskBankItem['level'],
  count: number
): TaskBankItem[] {
  const pool = TASK_BANK.filter((t) => t.skill === skill && (t.level === level || levelAbove(level, t.level)));
  const out: TaskBankItem[] = [];
  for (let i = 0; i < count; i++) {
    const pick = pool[i % pool.length];
    if (pick) out.push(pick);
  }
  return out;
}

function levelAbove(requested: TaskBankItem['level'], candidate: TaskBankItem['level']): boolean {
  const order: TaskBankItem['level'][] = ['A1', 'A2', 'B1', 'B2', 'C1'];
  return order.indexOf(candidate) <= order.indexOf(requested);
}

export const SKILLS: ReadonlyArray<TaskBankItem['skill'] | 'all'> = ['all','vocab','listening','reading','grammar','writing','speaking'] as const;
export const LEVELS: ReadonlyArray<TaskBankItem['level'] | 'any'> = ['any','A1','A2','B1','B2','C1'] as const;

export function filterTaskBank(options: { skill?: TaskBankItem['skill'] | 'all'; level?: TaskBankItem['level'] | 'any'; query?: string }) {
  const { skill = 'all', level = 'any', query = '' } = options || {} as any;
  const q = query.trim().toLowerCase();
  return TASK_BANK.filter((t) => {
    if (skill !== 'all' && t.skill !== skill) return false;
    if (level !== 'any' && !(t.level === level || levelAbove(level, t.level))) return false;
    if (!q) return true;
    const hay = `${t.label} ${t.subskill || ''} ${(t.tags || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}


