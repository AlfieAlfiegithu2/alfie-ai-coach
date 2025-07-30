-- Create universal tests table for all test types
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name text NOT NULL,
  test_type text NOT NULL DEFAULT 'IELTS', -- IELTS, PTE, TOEFL, General
  module text NOT NULL DEFAULT 'Reading', -- Reading, Listening, Writing, Speaking
  test_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'incomplete', -- incomplete, complete
  parts_completed integer DEFAULT 0,
  total_questions integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(test_type, module, test_number)
);

-- Create universal questions table for all question types
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  part_number integer NOT NULL DEFAULT 1,
  question_number_in_part integer NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL, -- Flexible for all IELTS types
  choices text, -- JSON or semicolon-separated choices for multiple choice
  correct_answer text NOT NULL,
  explanation text,
  passage_text text, -- For reading passages
  audio_url text, -- For listening questions
  image_url text, -- For visual questions
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tests table
CREATE POLICY "Tests are viewable by everyone" 
ON public.tests 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage tests" 
ON public.tests 
FOR ALL 
USING (false)
WITH CHECK (false);

-- RLS Policies for questions table
CREATE POLICY "Questions are viewable by everyone" 
ON public.questions 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage questions" 
ON public.questions 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Add triggers for updated_at
CREATE TRIGGER update_tests_updated_at
BEFORE UPDATE ON public.tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();