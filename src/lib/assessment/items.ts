export type AssessmentItem = {
  id: string;
  type: 'multi' | 'scale' | 'date';
  prompt: string;
  choices?: Array<{ id: string; label: string; value?: number }>;
  min?: number;
  max?: number;
  passage?: string;
};

export const universalAssessmentItems: AssessmentItem[] = [
  {
    id: 'goal',
    type: 'multi',
    prompt: 'What is your main goal?',
    choices: [
      { id: 'general', label: 'General English' },
      { id: 'ielts', label: 'IELTS' },
      { id: 'toeic', label: 'TOEIC' },
      { id: 'work', label: 'Work/Business' },
      { id: 'travel', label: 'Travel' }
    ]
  },
  {
    id: 'target_deadline',
    type: 'date',
    prompt: 'When is your target exam date or deadline?',
  },
  {
    id: 'time_per_day',
    type: 'multi',
    prompt: 'How much time can you study per day?',
    choices: [
      { id: 'under_30', label: 'Under 30 minutes' },
      { id: '1_hour', label: '1 hour' },
      { id: '2_hours', label: '2 hours' },
      { id: 'more', label: 'More than 2 hours' }
    ]
  },
  {
    id: 'target_score',
    type: 'multi',
    prompt: 'What is your target IELTS band score?',
    choices: [
      { id: '6.0', label: '6.0' },
      { id: '6.5', label: '6.5' },
      { id: '7.0', label: '7.0' },
      { id: '7.5', label: '7.5' },
      { id: '8.0', label: '8.0+' },
    ]
  },
  {
    id: 'reading_q1',
    type: 'multi',
    prompt: 'Choose the best completion: The meeting has been ______ to next Monday.',
    choices: [
      { id: 'a', label: 'advanced', value: 0 },
      { id: 'b', label: 'postponed', value: 1 },
      { id: 'c', label: 'expanded', value: 0 },
      { id: 'd', label: 'prepared', value: 0 }
    ]
  },
  {
    id: 'reading_p1_q1',
    type: 'multi',
    passage:
      'Many cities have introduced bicycle‑sharing schemes to reduce congestion.\n' +
      'Users can rent a bike from docking stations across the city and return it to any station.\n' +
      'Recent reports suggest a rise in cycling safety awareness but a small increase in minor incidents.',
    prompt: 'Statement: Users must return the bike to the same station they rented it from.',
    choices: [
      { id: 'true', label: 'True', value: 0 },
      { id: 'false', label: 'False', value: 1 },
      { id: 'ng', label: 'Not Given', value: 0 }
    ]
  },
  {
    id: 'reading_p1_q2',
    type: 'multi',
    passage:
      'Many cities have introduced bicycle‑sharing schemes to reduce congestion.\n' +
      'Users can rent a bike from docking stations across the city and return it to any station.\n' +
      'Recent reports suggest a rise in cycling safety awareness but a small increase in minor incidents.',
    prompt: 'Statement: Authorities created the schemes to ease traffic.',
    choices: [
      { id: 'true', label: 'True', value: 1 },
      { id: 'false', label: 'False', value: 0 },
      { id: 'ng', label: 'Not Given', value: 0 }
    ]
  },
  {
    id: 'reading_p1_q3',
    type: 'multi',
    passage:
      'Many cities have introduced bicycle‑sharing schemes to reduce congestion.\n' +
      'Users can rent a bike from docking stations across the city and return it to any station.\n' +
      'Recent reports suggest a rise in cycling safety awareness but a small increase in minor incidents.',
    prompt: 'Statement: There has been a major drop in accidents.',
    choices: [
      { id: 'true', label: 'True', value: 0 },
      { id: 'false', label: 'False', value: 1 },
      { id: 'ng', label: 'Not Given', value: 0 }
    ]
  },
  // Second short passage later in the test
  {
    id: 'reading_p2_q1',
    type: 'multi',
    passage:
      'Researchers examined the effect of short daily walks on concentration.\n' +
      'Participants who walked for ten minutes reported improved focus during tasks.\n' +
      'However, the study did not compare the effects with other exercises.',
    prompt: 'Statement: The study found walking improved focus.',
    choices: [
      { id: 'true', label: 'True', value: 1 },
      { id: 'false', label: 'False', value: 0 },
      { id: 'ng', label: 'Not Given', value: 0 }
    ]
  },
  {
    id: 'listening_q1',
    type: 'multi',
    prompt: 'Paraphrase understanding: “Please submit the report by noon.” means ______.',
    choices: [
      { id: 'a', label: 'finish the report tomorrow', value: 0 },
      { id: 'b', label: 'send the report before 12:00', value: 1 },
      { id: 'c', label: 'start the report at noon', value: 0 },
      { id: 'd', label: 'bring the report to the meeting', value: 0 }
    ]
  },
  {
    id: 'grammar_q1',
    type: 'multi',
    prompt: 'Choose the correct sentence.',
    choices: [
      { id: 'a', label: 'The manager have approved the budget.', value: 0 },
      { id: 'b', label: 'The manager has approved the budget.', value: 1 },
      { id: 'c', label: 'The manager approving the budget.', value: 0 }
    ]
  },
  {
    id: 'vocab_q1',
    type: 'multi',
    prompt: 'Which word means "improve"?',
    choices: [
      { id: 'decline', label: 'Decline', value: 0 },
      { id: 'enhance', label: 'Enhance', value: 1 },
      { id: 'ignore', label: 'Ignore', value: 0 }
    ]
  },
  // Additional neutral questions for deeper analysis
  {
    id: 'reading_q2',
    type: 'multi',
    prompt: 'Choose the best completion: Our sales have ______ steadily this quarter.',
    choices: [
      { id: 'a', label: 'risen', value: 1 },
      { id: 'b', label: 'fall', value: 0 },
      { id: 'c', label: 'decrease', value: 0 },
      { id: 'd', label: 'was rising', value: 0 }
    ]
  },
  {
    id: 'reading_q3',
    type: 'multi',
    prompt: 'Choose the best completion: The instructions were not ______ enough.',
    choices: [
      { id: 'a', label: 'clarify', value: 0 },
      { id: 'b', label: 'clear', value: 1 },
      { id: 'c', label: 'clearly', value: 0 },
      { id: 'd', label: 'clarity', value: 0 }
    ]
  },
  {
    id: 'reading_q4',
    type: 'multi',
    prompt: 'Choose the best completion: We will notify you ______ email.',
    choices: [
      { id: 'a', label: 'by', value: 1 },
      { id: 'b', label: 'on', value: 0 },
      { id: 'c', label: 'in', value: 0 },
      { id: 'd', label: 'at', value: 0 }
    ]
  },
  {
    id: 'reading_q5',
    type: 'multi',
    prompt: 'Choose the best completion: The project was completed ______ budget.',
    choices: [
      { id: 'a', label: 'under', value: 1 },
      { id: 'b', label: 'below of', value: 0 },
      { id: 'c', label: 'less', value: 0 },
      { id: 'd', label: 'lower', value: 0 }
    ]
  },
  {
    id: 'listening_q2',
    type: 'multi',
    prompt: 'Paraphrase understanding: “He is unavailable this afternoon.” means he ______ this afternoon.',
    choices: [
      { id: 'a', label: 'is free', value: 0 },
      { id: 'b', label: 'cannot meet', value: 1 },
      { id: 'c', label: 'will call', value: 0 },
      { id: 'd', label: 'is early', value: 0 }
    ]
  },
  {
    id: 'listening_q3',
    type: 'multi',
    prompt: 'Paraphrase understanding: “Let’s push back the deadline.” means ______ the deadline.',
    choices: [
      { id: 'a', label: 'move earlier', value: 0 },
      { id: 'b', label: 'extend', value: 1 },
      { id: 'c', label: 'cancel', value: 0 },
      { id: 'd', label: 'keep', value: 0 }
    ]
  },
  {
    id: 'listening_q4',
    type: 'multi',
    prompt: 'Paraphrase understanding: “Could you look into this issue?” means ______.',
    choices: [
      { id: 'a', label: 'ignore the problem', value: 0 },
      { id: 'b', label: 'investigate the problem', value: 1 },
      { id: 'c', label: 'solve it immediately', value: 0 },
      { id: 'd', label: 'approve the budget', value: 0 }
    ]
  },
  {
    id: 'listening_q5',
    type: 'multi',
    prompt: 'Paraphrase understanding: “I will get back to you.” means ______.',
    choices: [
      { id: 'a', label: 'I will reply later', value: 1 },
      { id: 'b', label: 'I will leave now', value: 0 },
      { id: 'c', label: 'I will disagree', value: 0 },
      { id: 'd', label: 'I will forward this', value: 0 }
    ]
  },
  {
    id: 'grammar_q2',
    type: 'multi',
    prompt: 'Choose the correct sentence.',
    choices: [
      { id: 'a', label: 'There is many reasons to apply.', value: 0 },
      { id: 'b', label: 'There are many reasons to apply.', value: 1 },
      { id: 'c', label: 'There be many reasons to apply.', value: 0 }
    ]
  },
  {
    id: 'grammar_q3',
    type: 'multi',
    prompt: 'Choose the correct completion: The report ______ by Friday.',
    choices: [
      { id: 'a', label: 'must submit', value: 0 },
      { id: 'b', label: 'must be submitted', value: 1 },
      { id: 'c', label: 'must to submit', value: 0 }
    ]
  },
  {
    id: 'grammar_q4',
    type: 'multi',
    prompt: 'Choose the correct completion: I look forward to ______ you.',
    choices: [
      { id: 'a', label: 'meet', value: 0 },
      { id: 'b', label: 'meeting', value: 1 },
      { id: 'c', label: 'to meet', value: 0 }
    ]
  },
  {
    id: 'grammar_q5',
    type: 'multi',
    prompt: 'Choose the correct sentence.',
    choices: [
      { id: 'a', label: 'Each employees receive benefits.', value: 0 },
      { id: 'b', label: 'Each employee receives benefits.', value: 1 },
      { id: 'c', label: 'Each employee receive benefits.', value: 0 }
    ]
  },
  {
    id: 'vocab_q2',
    type: 'multi',
    prompt: 'Which word is closest in meaning to "delayed"?',
    choices: [
      { id: 'a', label: 'postponed', value: 1 },
      { id: 'b', label: 'hired', value: 0 },
      { id: 'c', label: 'arranged', value: 0 },
      { id: 'd', label: 'moved', value: 0 }
    ]
  },
  {
    id: 'vocab_q3',
    type: 'multi',
    prompt: 'Which word is the best opposite of "decline"?',
    choices: [
      { id: 'a', label: 'increase', value: 1 },
      { id: 'b', label: 'reduce', value: 0 },
      { id: 'c', label: 'fall', value: 0 },
      { id: 'd', label: 'lower', value: 0 }
    ]
  },
  {
    id: 'vocab_q4',
    type: 'multi',
    prompt: 'Which word means "require"?',
    choices: [
      { id: 'a', label: 'need', value: 1 },
      { id: 'b', label: 'prefer', value: 0 },
      { id: 'c', label: 'consider', value: 0 },
      { id: 'd', label: 'avoid', value: 0 }
    ]
  },
  {
    id: 'vocab_q5',
    type: 'multi',
    prompt: 'Which word best completes: We will ______ the proposal next week.',
    choices: [
      { id: 'a', label: 'review', value: 1 },
      { id: 'b', label: 'sale', value: 0 },
      { id: 'c', label: 'arrive', value: 0 },
      { id: 'd', label: 'price', value: 0 }
    ]
  }
];


