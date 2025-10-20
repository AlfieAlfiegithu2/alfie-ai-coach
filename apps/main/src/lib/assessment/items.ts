export type AssessmentItem = {
  id: string;
  type: 'multi' | 'scale' | 'date';
  prompt: string;
  choices?: Array<{ id: string; label: string; value?: number }>;
  min?: number;
  max?: number;
  passage?: string;
  audio?: string; // optional audio clip for listening items
  transcript?: string; // optional transcript fallback for TTS
  multiSelect?: boolean; // allow multiple selections (stored as JSON array string)
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
    id: 'study_days',
    type: 'multi',
    prompt: 'Which days will you study each week?',
    multiSelect: true,
    choices: [
      { id: '0', label: 'Sun' },
      { id: '1', label: 'Mon' },
      { id: '2', label: 'Tue' },
      { id: '3', label: 'Wed' },
      { id: '4', label: 'Thu' },
      { id: '5', label: 'Fri' },
      { id: '6', label: 'Sat' }
    ]
  },
  {
    id: 'first_language',
    type: 'multi',
    prompt: 'What is your first language?',
    choices: [
      { id: 'ko', label: 'Korean' },
      { id: 'ja', label: 'Japanese' },
      { id: 'zh', label: 'Chinese' },
      { id: 'vi', label: 'Vietnamese' },
      { id: 'es', label: 'Spanish' },
      { id: 'pt', label: 'Portuguese' },
      { id: 'ru', label: 'Russian' },
      { id: 'ar', label: 'Arabic' },
      { id: 'hi', label: 'Hindi' },
      { id: 'fr', label: 'French' },
      { id: 'de', label: 'German' },
      { id: 'other', label: 'Other' }
    ]
  },
  {
    id: 'plan_native_language',
    type: 'multi',
    prompt: 'Do you want your plan generated in your first language?',
    choices: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' }
    ]
  },
  // Writing micro-tasks (choose best option)
  {
    id: 'writing_q1',
    type: 'multi',
    prompt: 'Writing Task 2: Choose the strongest thesis statement for the topic: “Some people think studying art in school is a waste of time.”',
    choices: [
      { id: 'a', label: 'Art is important and should be studied by everyone.', value: 0 },
      { id: 'b', label: 'Although some believe art is unnecessary, it develops creativity and cultural awareness and thus deserves a central place in school curricula.', value: 1 },
      { id: 'c', label: 'Art is fun for some students.', value: 0 }
    ]
  },
  {
    id: 'writing_q2',
    type: 'multi',
    prompt: 'Writing Task 1: Which sentence best describes a chart where exports fell from 60 to 40 while imports rose from 30 to 50?',
    choices: [
      { id: 'a', label: 'Both exports and imports increased steadily.', value: 0 },
      { id: 'b', label: 'Exports declined markedly as imports climbed, reversing the initial gap.', value: 1 },
      { id: 'c', label: 'Imports and exports stayed the same.', value: 0 }
    ]
  },
  {
    id: 'writing_q3',
    type: 'multi',
    prompt: 'Coherence: Choose the most logical order of sentences (1) In addition, libraries host quiet study spaces. (2) Libraries remain vital for communities. (3) They provide free access to information. (4) As a result, people of all ages benefit.',
    choices: [
      { id: 'a', label: '2 → 3 → 1 → 4', value: 1 },
      { id: 'b', label: '3 → 2 → 1 → 4', value: 0 },
      { id: 'c', label: '2 → 1 → 3 → 4', value: 0 }
    ]
  },
  {
    id: 'writing_q4',
    type: 'multi',
    prompt: 'Register: Select the more formal alternative: “kids should get free tickets.”',
    choices: [
      { id: 'a', label: 'children ought to receive complimentary tickets', value: 1 },
      { id: 'b', label: 'kids must get free tickets ASAP', value: 0 },
      { id: 'c', label: 'give kids free tickets', value: 0 }
    ]
  },
  {
    id: 'target_deadline',
    type: 'date',
    prompt: 'When is your target exam date or deadline?',
  },
  {
    id: 'target_score',
    type: 'multi',
    prompt: 'What is your target IELTS band score?',
    choices: [
      { id: '5.0', label: '5.0 or below' },
      { id: '5.5', label: '5.5' },
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
    id: 'listening_clip1_q1',
    type: 'multi',
    audio: '/assets/listening/clip1.mp3',
    transcript: 'Please send me a short summary by lunchtime today.',
    prompt: 'Clip 1: What does the speaker ask you to do?',
    choices: [
      { id: 'a', label: 'send the summary by lunchtime', value: 1 },
      { id: 'b', label: 'book a meeting for tomorrow', value: 0 },
      { id: 'c', label: 'prepare slides for a presentation', value: 0 },
      { id: 'd', label: 'call the client immediately', value: 0 }
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
    id: 'listening_clip2_q1',
    type: 'multi',
    audio: '/assets/listening/clip2.mp3',
    transcript: 'To register for the exam, fill in the online form, upload your ID, and pay the fee.',
    prompt: 'Clip 2: What is the main topic?',
    choices: [
      { id: 'a', label: 'library opening hours', value: 0 },
      { id: 'b', label: 'exam registration steps', value: 1 },
      { id: 'c', label: 'bus timetable changes', value: 0 },
      { id: 'd', label: 'assignment grading policy', value: 0 }
    ]
  },
  {
    id: 'listening_clip3_q1',
    type: 'multi',
    audio: '/assets/listening/clip3.mp3',
    transcript: 'I will send a follow up email with the details after our call.',
    prompt: 'Clip 3: What will happen next?',
    choices: [
      { id: 'a', label: 'the meeting is cancelled', value: 0 },
      { id: 'b', label: 'the speaker will send a follow‑up email', value: 1 },
      { id: 'c', label: 'the deadline is moved earlier', value: 0 },
      { id: 'd', label: 'the speaker will call the manager now', value: 0 }
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


