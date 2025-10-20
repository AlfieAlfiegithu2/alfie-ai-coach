-- First, completely drop the constraints to allow updates
ALTER TABLE public.reading_questions DROP CONSTRAINT IF EXISTS reading_questions_question_type_check;
ALTER TABLE public.listening_questions DROP CONSTRAINT IF EXISTS listening_questions_question_type_check;

-- Update existing question types to match official IELTS types
UPDATE public.reading_questions 
SET question_type = 'Summary Completion' 
WHERE question_type = 'fill_in_blank';

-- Now add the new constraints with official IELTS question types
ALTER TABLE public.reading_questions 
ADD CONSTRAINT reading_questions_question_type_check 
CHECK (question_type = ANY (ARRAY[
  'Matching Headings',
  'Matching Paragraph Information', 
  'Matching Features',
  'Matching Sentence Endings',
  'True/False/Not Given',
  'Yes/No/Not Given',
  'Multiple Choice',
  'List of Options',
  'Choose a Title',
  'Short-answer Questions',
  'Sentence Completion',
  'Summary Completion',
  'Table Completion',
  'Flow Chart Completion',
  'Diagram Label Completion'
]));

ALTER TABLE public.listening_questions 
ADD CONSTRAINT listening_questions_question_type_check 
CHECK (question_type = ANY (ARRAY[
  'Multiple Choice',
  'Matching',
  'Plan/Map/Diagram Labelling',
  'Form Completion',
  'Note Completion', 
  'Table Completion',
  'Flow-chart Completion',
  'Summary Completion',
  'Sentence Completion',
  'Short-answer Questions'
]));