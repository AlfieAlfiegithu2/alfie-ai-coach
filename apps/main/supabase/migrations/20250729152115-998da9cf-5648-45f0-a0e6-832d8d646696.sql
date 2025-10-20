-- Create separate tables for PTE Academic content
CREATE TABLE public.pte_passages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  passage_type TEXT,
  test_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  book_number INTEGER DEFAULT 1,
  part_number INTEGER DEFAULT 1,
  pte_book TEXT DEFAULT 'PTE 20',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pte_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_id UUID REFERENCES pte_passages(id),
  question_number INTEGER NOT NULL DEFAULT 1,
  question_type TEXT DEFAULT 'Multiple Choice',
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  band_impact NUMERIC,
  part_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  pte_book TEXT DEFAULT 'PTE 20',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pte_speaking_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  part_number INTEGER DEFAULT 1,
  test_number INTEGER DEFAULT 1,
  time_limit INTEGER DEFAULT 2,
  pte_book TEXT DEFAULT 'PTE 20',
  follow_up_questions JSONB,
  sample_answer TEXT,
  band_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pte_writing_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  test_number INTEGER DEFAULT 1,
  task_type TEXT DEFAULT 'Summarize Written Text',
  task_number INTEGER DEFAULT 1,
  time_limit INTEGER DEFAULT 20,
  word_limit INTEGER DEFAULT 250,
  pte_book TEXT DEFAULT 'PTE 20',
  sample_answer TEXT,
  band_criteria JSONB,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pte_listening_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  part_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  test_number INTEGER DEFAULT 1,
  pte_book TEXT DEFAULT 'PTE 20',
  audio_url TEXT,
  transcript TEXT,
  instructions TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pte_listening_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES pte_listening_sections(id),
  question_number INTEGER NOT NULL DEFAULT 1,
  question_type TEXT DEFAULT 'Multiple Choice',
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  band_impact NUMERIC,
  part_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create separate tables for TOEFL iBT content
CREATE TABLE public.toefl_passages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  passage_type TEXT,
  test_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  book_number INTEGER DEFAULT 1,
  part_number INTEGER DEFAULT 1,
  toefl_book TEXT DEFAULT 'TOEFL 20',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.toefl_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_id UUID REFERENCES toefl_passages(id),
  question_number INTEGER NOT NULL DEFAULT 1,
  question_type TEXT DEFAULT 'Multiple Choice',
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  band_impact NUMERIC,
  part_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  toefl_book TEXT DEFAULT 'TOEFL 20',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.toefl_speaking_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  part_number INTEGER DEFAULT 1,
  test_number INTEGER DEFAULT 1,
  time_limit INTEGER DEFAULT 2,
  toefl_book TEXT DEFAULT 'TOEFL 20',
  follow_up_questions JSONB,
  sample_answer TEXT,
  band_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.toefl_writing_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  test_number INTEGER DEFAULT 1,
  task_type TEXT DEFAULT 'Independent Essay',
  task_number INTEGER DEFAULT 1,
  time_limit INTEGER DEFAULT 30,
  word_limit INTEGER DEFAULT 400,
  toefl_book TEXT DEFAULT 'TOEFL 20',
  sample_answer TEXT,
  band_criteria JSONB,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.toefl_listening_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  part_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  test_number INTEGER DEFAULT 1,
  toefl_book TEXT DEFAULT 'TOEFL 20',
  audio_url TEXT,
  transcript TEXT,
  instructions TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.toefl_listening_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES toefl_listening_sections(id),
  question_number INTEGER NOT NULL DEFAULT 1,
  question_type TEXT DEFAULT 'Multiple Choice',
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  band_impact NUMERIC,
  part_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create separate tables for General English content
CREATE TABLE public.general_passages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  passage_type TEXT,
  test_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  book_number INTEGER DEFAULT 1,
  part_number INTEGER DEFAULT 1,
  general_book TEXT DEFAULT 'General English 20',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.general_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_id UUID REFERENCES general_passages(id),
  question_number INTEGER NOT NULL DEFAULT 1,
  question_type TEXT DEFAULT 'Multiple Choice',
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  band_impact NUMERIC,
  part_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  general_book TEXT DEFAULT 'General English 20',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.general_speaking_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  part_number INTEGER DEFAULT 1,
  test_number INTEGER DEFAULT 1,
  time_limit INTEGER DEFAULT 2,
  general_book TEXT DEFAULT 'General English 20',
  follow_up_questions JSONB,
  sample_answer TEXT,
  band_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.general_writing_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  test_number INTEGER DEFAULT 1,
  task_type TEXT DEFAULT 'Essay',
  task_number INTEGER DEFAULT 1,
  time_limit INTEGER DEFAULT 20,
  word_limit INTEGER DEFAULT 250,
  general_book TEXT DEFAULT 'General English 20',
  sample_answer TEXT,
  band_criteria JSONB,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.general_listening_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  part_number INTEGER DEFAULT 1,
  section_number INTEGER DEFAULT 1,
  test_number INTEGER DEFAULT 1,
  general_book TEXT DEFAULT 'General English 20',
  audio_url TEXT,
  transcript TEXT,
  instructions TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.general_listening_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES general_listening_sections(id),
  question_number INTEGER NOT NULL DEFAULT 1,
  question_type TEXT DEFAULT 'Multiple Choice',
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  band_impact NUMERIC,
  part_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all new tables
ALTER TABLE public.pte_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pte_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pte_speaking_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pte_writing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pte_listening_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pte_listening_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.toefl_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toefl_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toefl_speaking_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toefl_writing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toefl_listening_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toefl_listening_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.general_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_speaking_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_writing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_listening_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_listening_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for public viewing and admin management
-- PTE policies
CREATE POLICY "PTE passages are viewable by everyone" ON public.pte_passages FOR SELECT USING (true);
CREATE POLICY "Only admins can manage PTE passages" ON public.pte_passages FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "PTE questions are viewable by everyone" ON public.pte_questions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage PTE questions" ON public.pte_questions FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "PTE speaking prompts are viewable by everyone" ON public.pte_speaking_prompts FOR SELECT USING (true);
CREATE POLICY "Only admins can manage PTE speaking prompts" ON public.pte_speaking_prompts FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "PTE writing prompts are viewable by everyone" ON public.pte_writing_prompts FOR SELECT USING (true);
CREATE POLICY "Only admins can manage PTE writing prompts" ON public.pte_writing_prompts FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "PTE listening sections are viewable by everyone" ON public.pte_listening_sections FOR SELECT USING (true);
CREATE POLICY "Only admins can manage PTE listening sections" ON public.pte_listening_sections FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "PTE listening questions are viewable by everyone" ON public.pte_listening_questions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage PTE listening questions" ON public.pte_listening_questions FOR ALL USING (false) WITH CHECK (false);

-- TOEFL policies
CREATE POLICY "TOEFL passages are viewable by everyone" ON public.toefl_passages FOR SELECT USING (true);
CREATE POLICY "Only admins can manage TOEFL passages" ON public.toefl_passages FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "TOEFL questions are viewable by everyone" ON public.toefl_questions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage TOEFL questions" ON public.toefl_questions FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "TOEFL speaking prompts are viewable by everyone" ON public.toefl_speaking_prompts FOR SELECT USING (true);
CREATE POLICY "Only admins can manage TOEFL speaking prompts" ON public.toefl_speaking_prompts FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "TOEFL writing prompts are viewable by everyone" ON public.toefl_writing_prompts FOR SELECT USING (true);
CREATE POLICY "Only admins can manage TOEFL writing prompts" ON public.toefl_writing_prompts FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "TOEFL listening sections are viewable by everyone" ON public.toefl_listening_sections FOR SELECT USING (true);
CREATE POLICY "Only admins can manage TOEFL listening sections" ON public.toefl_listening_sections FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "TOEFL listening questions are viewable by everyone" ON public.toefl_listening_questions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage TOEFL listening questions" ON public.toefl_listening_questions FOR ALL USING (false) WITH CHECK (false);

-- General English policies
CREATE POLICY "General passages are viewable by everyone" ON public.general_passages FOR SELECT USING (true);
CREATE POLICY "Only admins can manage general passages" ON public.general_passages FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "General questions are viewable by everyone" ON public.general_questions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage general questions" ON public.general_questions FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "General speaking prompts are viewable by everyone" ON public.general_speaking_prompts FOR SELECT USING (true);
CREATE POLICY "Only admins can manage general speaking prompts" ON public.general_speaking_prompts FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "General writing prompts are viewable by everyone" ON public.general_writing_prompts FOR SELECT USING (true);
CREATE POLICY "Only admins can manage general writing prompts" ON public.general_writing_prompts FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "General listening sections are viewable by everyone" ON public.general_listening_sections FOR SELECT USING (true);
CREATE POLICY "Only admins can manage general listening sections" ON public.general_listening_sections FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "General listening questions are viewable by everyone" ON public.general_listening_questions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage general listening questions" ON public.general_listening_questions FOR ALL USING (false) WITH CHECK (false);

-- Create update triggers for timestamp management
CREATE TRIGGER update_pte_passages_updated_at BEFORE UPDATE ON public.pte_passages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pte_speaking_prompts_updated_at BEFORE UPDATE ON public.pte_speaking_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pte_writing_prompts_updated_at BEFORE UPDATE ON public.pte_writing_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pte_listening_sections_updated_at BEFORE UPDATE ON public.pte_listening_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_toefl_passages_updated_at BEFORE UPDATE ON public.toefl_passages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_toefl_speaking_prompts_updated_at BEFORE UPDATE ON public.toefl_speaking_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_toefl_writing_prompts_updated_at BEFORE UPDATE ON public.toefl_writing_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_toefl_listening_sections_updated_at BEFORE UPDATE ON public.toefl_listening_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_general_passages_updated_at BEFORE UPDATE ON public.general_passages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_general_speaking_prompts_updated_at BEFORE UPDATE ON public.general_speaking_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_general_writing_prompts_updated_at BEFORE UPDATE ON public.general_writing_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_general_listening_sections_updated_at BEFORE UPDATE ON public.general_listening_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();