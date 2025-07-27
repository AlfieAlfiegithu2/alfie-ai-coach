// IELTS Question Types Configuration
// Based on official IELTS guidelines with exact string formats

export interface QuestionTypeDefinition {
  value: string;
  label: string;
  description: string;
  tips: string;
}

export const READING_QUESTION_TYPES: QuestionTypeDefinition[] = [
  {
    value: "Matching Headings",
    label: "Matching Headings",
    description: "Read paragraphs and choose best topic from a list of headings",
    tips: "Understand main vs supporting ideas; read the list of headings first; answers are often numbers"
  },
  {
    value: "Matching Paragraph Information", 
    label: "Matching Paragraph Information",
    description: "Choose statements that fit specific paragraph content",
    tips: "Use keywords and paraphrasing; answers are not necessarily consecutive"
  },
  {
    value: "Matching Features",
    label: "Matching Features", 
    description: "Match facts, ideas, or opinions (e.g., researcher to discovery)",
    tips: "Focus on specifics, synonyms, and keywords"
  },
  {
    value: "Matching Sentence Endings",
    label: "Matching Sentence Endings",
    description: "Match incomplete sentences to appropriate ending alternatives",
    tips: "Practice grammar like subject-verb agreement and tenses"
  },
  {
    value: "True/False/Not Given",
    label: "True/False/Not Given",
    description: "Verify statements against passage content",
    tips: "True if matches passage, False if contradicts, Not Given if not mentioned"
  },
  {
    value: "Yes/No/Not Given", 
    label: "Yes/No/Not Given",
    description: "Evaluate views, claims, or opinions in the passage",
    tips: "Yes if matches author's view, No if contradicts, Not Given if not mentioned"
  },
  {
    value: "Multiple Choice",
    label: "Multiple Choice",
    description: "Choose the correct answer from multiple options",
    tips: "Understand main ideas and specific information; use skimming and elimination"
  },
  {
    value: "List of Options",
    label: "List of Options", 
    description: "Select multiple answers from a list (e.g., 'Which THREE?')",
    tips: "Similar to multiple choice but requires selecting several correct options"
  },
  {
    value: "Choose a Title",
    label: "Choose a Title",
    description: "Select the most appropriate title for the passage",
    tips: "Understand main ideas vs supporting details and overall purpose"
  },
  {
    value: "Short-answer Questions",
    label: "Short-answer Questions",
    description: "Answer questions with specific information from the passage",
    tips: "Questions usually follow the order of information in the passage"
  },
  {
    value: "Sentence Completion",
    label: "Sentence Completion", 
    description: "Complete sentences using words from the passage",
    tips: "Use paraphrasing and look for synonyms"
  },
  {
    value: "Summary Completion",
    label: "Summary Completion",
    description: "Complete a summary of part of the passage",
    tips: "Identify parts of speech and grammatical requirements"
  },
  {
    value: "Table Completion",
    label: "Table Completion",
    description: "Fill in missing information in a table format",
    tips: "Follow the logical flow of information in the table structure"
  },
  {
    value: "Flow Chart Completion", 
    label: "Flow Chart Completion",
    description: "Fill in missing steps or information in a flow chart",
    tips: "Understand the sequence and logical progression"
  },
  {
    value: "Diagram Label Completion",
    label: "Diagram Label Completion", 
    description: "Fill in labels or parts of diagrams",
    tips: "Use synonyms and paraphrases; focus on technical or descriptive vocabulary"
  }
];

export const LISTENING_QUESTION_TYPES: QuestionTypeDefinition[] = [
  {
    value: "Multiple Choice",
    label: "Multiple Choice",
    description: "Choose the correct answer from options while listening",
    tips: "Listen for specific information and main ideas"
  },
  {
    value: "Matching",
    label: "Matching", 
    description: "Match items from two lists",
    tips: "Listen for relationships between different pieces of information"
  },
  {
    value: "Plan/Map/Diagram Labelling",
    label: "Plan/Map/Diagram Labelling",
    description: "Label parts of a visual representation",
    tips: "Follow directions and spatial relationships described in audio"
  },
  {
    value: "Form Completion",
    label: "Form Completion",
    description: "Fill in missing information on a form",
    tips: "Listen for specific details like names, numbers, dates"
  },
  {
    value: "Note Completion",
    label: "Note Completion", 
    description: "Complete notes with missing information",
    tips: "Focus on key points and main ideas"
  },
  {
    value: "Table Completion",
    label: "Table Completion",
    description: "Fill in missing information in table format",
    tips: "Follow the structure and categories in the table"
  },
  {
    value: "Flow-chart Completion",
    label: "Flow-chart Completion",
    description: "Complete steps in a process or sequence",
    tips: "Listen for sequence markers and logical progression"
  },
  {
    value: "Summary Completion",
    label: "Summary Completion",
    description: "Complete a summary of the listening passage",
    tips: "Focus on main ideas and overall content"
  },
  {
    value: "Sentence Completion",
    label: "Sentence Completion", 
    description: "Complete sentences with information from audio",
    tips: "Pay attention to grammar and word limits"
  },
  {
    value: "Short-answer Questions",
    label: "Short-answer Questions",
    description: "Answer questions with brief responses",
    tips: "Listen for specific factual information"
  }
];

export const WRITING_QUESTION_TYPES: QuestionTypeDefinition[] = [
  {
    value: "Task 1 - Graph Description",
    label: "Task 1 - Graph Description",
    description: "Describe data presented in graphs, charts, or tables",
    tips: "Focus on trends, comparisons, and key features"
  },
  {
    value: "Task 1 - Map Description", 
    label: "Task 1 - Map Description",
    description: "Describe changes shown in maps over time",
    tips: "Describe locations, changes, and spatial relationships"
  },
  {
    value: "Task 1 - Process Description",
    label: "Task 1 - Process Description", 
    description: "Describe how something works or is made",
    tips: "Use sequence words and passive voice appropriately"
  },
  {
    value: "Task 2 - Essay",
    label: "Task 2 - Essay",
    description: "Write an essay responding to a question or statement",
    tips: "Present clear arguments with examples and logical structure"
  }
];

export const SPEAKING_QUESTION_TYPES: QuestionTypeDefinition[] = [
  {
    value: "Part 1 - Introduction and Interview",
    label: "Part 1 - Introduction and Interview", 
    description: "Answer questions about yourself and familiar topics",
    tips: "Give personal responses with some detail and examples"
  },
  {
    value: "Part 2 - Long Turn (Cue Card)",
    label: "Part 2 - Long Turn (Cue Card)",
    description: "Speak for 1-2 minutes on a given topic using cue card",
    tips: "Use the preparation time to plan and cover all points on the card"
  },
  {
    value: "Part 3 - Discussion", 
    label: "Part 3 - Discussion",
    description: "Discuss abstract topics related to Part 2 theme",
    tips: "Give detailed answers with explanations, examples, and analysis"
  }
];

// Question type mapping for CSV imports - handles variations and common mistakes
export const QUESTION_TYPE_MAPPINGS: Record<string, string> = {
  // Reading mappings
  "True False Not Given": "True/False/Not Given",
  "True False Not Given or Yes No Not Given": "True/False/Not Given",
  "TF/NG": "True/False/Not Given", 
  "T/F/NG": "True/False/Not Given",
  "Yes No Not Given": "Yes/No/Not Given",
  "Y/N/NG": "Yes/No/Not Given",
  "Multiple choice (reading)": "Multiple Choice",
  "multiple choice (reading)": "Multiple Choice",
  "Short answer": "Short-answer Questions",
  "short answer": "Short-answer Questions",
  "Completion Diagrams": "Diagram Label Completion",
  "Diagram completion": "Diagram Label Completion",
  "Flow chart": "Flow Chart Completion",
  "Flowchart": "Flow Chart Completion",
  "Table completion (reading)": "Table Completion",
  "Summary completion (reading)": "Summary Completion",
  "Sentence completion (reading)": "Sentence Completion",
  "Matching headings": "Matching Headings",
  "matching headings": "Matching Headings",
  "Matching features": "Matching Features",
  "matching features": "Matching Features",
  
  // Listening mappings
  "multiple choice (listening)": "Multiple Choice",
  "Multiple choice (listening)": "Multiple Choice",
  "Plan labelling": "Plan/Map/Diagram Labelling",
  "Map labelling": "Plan/Map/Diagram Labelling", 
  "Diagram labelling": "Plan/Map/Diagram Labelling",
  "Form completion": "Form Completion",
  "Note completion": "Note Completion",
  "Table completion (listening)": "Table Completion",
  "Summary completion (listening)": "Summary Completion",
  "Sentence completion (listening)": "Sentence Completion",
  "Short answer (listening)": "Short-answer Questions",
  
  // Writing mappings
  "Task 1 Graph": "Task 1 - Graph Description",
  "Task 1 Map": "Task 1 - Map Description", 
  "Task 1 Process": "Task 1 - Process Description",
  "Task 2 Essay": "Task 2 - Essay",
  "Essay": "Task 2 - Essay",
  
  // Speaking mappings
  "Part 1": "Part 1 - Introduction and Interview",
  "Part 2": "Part 2 - Long Turn (Cue Card)",
  "Part 3": "Part 3 - Discussion",
  "Cue Card": "Part 2 - Long Turn (Cue Card)"
};

export function getQuestionTypesForModule(module: 'reading' | 'listening' | 'writing' | 'speaking'): QuestionTypeDefinition[] {
  switch (module) {
    case 'reading':
      return READING_QUESTION_TYPES;
    case 'listening':
      return LISTENING_QUESTION_TYPES;
    case 'writing':
      return WRITING_QUESTION_TYPES;
    case 'speaking':
      return SPEAKING_QUESTION_TYPES;
    default:
      return [];
  }
}

export function mapQuestionType(inputType: string): string {
  // First check if it's already a valid type
  const allTypes = [
    ...READING_QUESTION_TYPES,
    ...LISTENING_QUESTION_TYPES, 
    ...WRITING_QUESTION_TYPES,
    ...SPEAKING_QUESTION_TYPES
  ].map(t => t.value);
  
  if (allTypes.includes(inputType)) {
    return inputType;
  }
  
  // Try to map from variations
  return QUESTION_TYPE_MAPPINGS[inputType] || inputType;
}

export function validateQuestionType(type: string, module: 'reading' | 'listening' | 'writing' | 'speaking'): boolean {
  const validTypes = getQuestionTypesForModule(module).map(t => t.value);
  return validTypes.includes(type);
}