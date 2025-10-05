export type AssessmentItem = {
  id: string;
  type: 'multi' | 'scale';
  prompt: string;
  choices?: Array<{ id: string; label: string; value?: number }>;
  min?: number;
  max?: number;
};

export const universalAssessmentItems: AssessmentItem[] = [
  {
    id: 'goal',
    type: 'multi',
    prompt: 'What is your main goal?',
    choices: [
      { id: 'general', label: 'General English' },
      { id: 'ielts', label: 'IELTS' },
      { id: 'toefl', label: 'TOEFL' },
      { id: 'work', label: 'Work/Business' },
      { id: 'travel', label: 'Travel' }
    ]
  },
  {
    id: 'self_level',
    type: 'multi',
    prompt: 'How would you rate your current level?',
    choices: [
      { id: 'A1', label: 'A1 Beginner' },
      { id: 'A2', label: 'A2 Elementary' },
      { id: 'B1', label: 'B1 Intermediate' },
      { id: 'B2', label: 'B2 Upper-Intermediate' },
      { id: 'C1', label: 'C1 Advanced' }
    ]
  },
  {
    id: 'time_per_day',
    type: 'multi',
    prompt: 'How much time can you study per day?',
    choices: [
      { id: '15', label: '15 minutes' },
      { id: '30', label: '30 minutes' },
      { id: '45', label: '45 minutes' },
      { id: '60', label: '60+ minutes' }
    ]
  },
  {
    id: 'reading_quick',
    type: 'multi',
    prompt: 'Choose the best synonym for "rapid"',
    choices: [
      { id: 'slow', label: 'Slow', value: 0 },
      { id: 'quick', label: 'Quick', value: 1 },
      { id: 'late', label: 'Late', value: 0 },
      { id: 'tiny', label: 'Tiny', value: 0 }
    ]
  },
  {
    id: 'listening_quick',
    type: 'multi',
    prompt: 'Which word rhymes with "four"?',
    choices: [
      { id: 'car', label: 'Car', value: 0 },
      { id: 'for', label: 'For', value: 1 },
      { id: 'far', label: 'Far', value: 0 },
      { id: 'fear', label: 'Fear', value: 0 }
    ]
  },
  {
    id: 'grammar_quick',
    type: 'multi',
    prompt: 'Choose the correct sentence',
    choices: [
      { id: 'a', label: 'He don’t like tea.', value: 0 },
      { id: 'b', label: 'He doesn’t like tea.', value: 1 },
      { id: 'c', label: 'He not like tea.', value: 0 }
    ]
  },
  {
    id: 'vocab_quick',
    type: 'multi',
    prompt: 'Which word means "improve"?',
    choices: [
      { id: 'decline', label: 'Decline', value: 0 },
      { id: 'enhance', label: 'Enhance', value: 1 },
      { id: 'ignore', label: 'Ignore', value: 0 }
    ]
  }
];


