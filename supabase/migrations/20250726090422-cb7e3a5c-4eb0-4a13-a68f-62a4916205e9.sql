-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-files', 'audio-files', true);

-- Create storage policies for audio files
CREATE POLICY "Audio files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-files');

CREATE POLICY "Admins can upload audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Admins can update audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-files');

CREATE POLICY "Admins can delete audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-files');

-- Create admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for admin users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Reading passages table
CREATE TABLE public.reading_passages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  passage_type TEXT CHECK (passage_type IN ('academic', 'general')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reading questions table
CREATE TABLE public.reading_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_id UUID REFERENCES public.reading_passages(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_in_blank', 'matching', 'short_answer')),
  correct_answer TEXT NOT NULL,
  options JSONB, -- For multiple choice options
  explanation TEXT NOT NULL,
  band_impact DECIMAL(2,1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Listening sections table
CREATE TABLE public.listening_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  section_number INTEGER CHECK (section_number BETWEEN 1 AND 4),
  audio_url TEXT,
  transcript TEXT,
  instructions TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Listening questions table
CREATE TABLE public.listening_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES public.listening_sections(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_in_blank', 'matching', 'short_answer')),
  correct_answer TEXT NOT NULL,
  options JSONB,
  explanation TEXT NOT NULL,
  band_impact DECIMAL(2,1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Writing prompts table
CREATE TABLE public.writing_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number INTEGER CHECK (task_number IN (1, 2)),
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  task_type TEXT, -- For Task 1: 'chart', 'graph', 'diagram', etc.
  image_url TEXT, -- For Task 1 visual prompts
  word_limit INTEGER DEFAULT 250,
  time_limit INTEGER DEFAULT 20, -- in minutes
  sample_answer TEXT,
  band_criteria JSONB, -- Criteria for different band scores
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Speaking prompts table
CREATE TABLE public.speaking_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_number INTEGER CHECK (part_number BETWEEN 1 AND 3),
  title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  follow_up_questions JSONB, -- Array of follow-up questions
  time_limit INTEGER DEFAULT 2, -- in minutes
  sample_answer TEXT,
  band_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaking_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for users taking tests)
CREATE POLICY "Reading passages are viewable by everyone" ON public.reading_passages FOR SELECT USING (true);
CREATE POLICY "Reading questions are viewable by everyone" ON public.reading_questions FOR SELECT USING (true);
CREATE POLICY "Listening sections are viewable by everyone" ON public.listening_sections FOR SELECT USING (true);
CREATE POLICY "Listening questions are viewable by everyone" ON public.listening_questions FOR SELECT USING (true);
CREATE POLICY "Writing prompts are viewable by everyone" ON public.writing_prompts FOR SELECT USING (true);
CREATE POLICY "Speaking prompts are viewable by everyone" ON public.speaking_prompts FOR SELECT USING (true);

-- Create admin-only policies for content management
CREATE POLICY "Only admins can manage reading passages" ON public.reading_passages 
FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Only admins can manage reading questions" ON public.reading_questions 
FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Only admins can manage listening sections" ON public.listening_sections 
FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Only admins can manage listening questions" ON public.listening_questions 
FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Only admins can manage writing prompts" ON public.writing_prompts 
FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Only admins can manage speaking prompts" ON public.speaking_prompts 
FOR ALL USING (false) WITH CHECK (false);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reading_passages_updated_at BEFORE UPDATE ON public.reading_passages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_listening_sections_updated_at BEFORE UPDATE ON public.listening_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_writing_prompts_updated_at BEFORE UPDATE ON public.writing_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_speaking_prompts_updated_at BEFORE UPDATE ON public.speaking_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();