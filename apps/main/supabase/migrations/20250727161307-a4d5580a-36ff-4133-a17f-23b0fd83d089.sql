-- First update the question numbering to be continuous across parts
-- This function will automatically renumber questions to be continuous per section
CREATE OR REPLACE FUNCTION update_question_numbering()
RETURNS void AS $$
DECLARE
    rec RECORD;
    question_rec RECORD;
    current_number INTEGER;
BEGIN
    -- For each unique cambridge_book and section_number combination
    FOR rec IN 
        SELECT DISTINCT cambridge_book, section_number 
        FROM reading_questions 
        WHERE cambridge_book IS NOT NULL AND section_number IS NOT NULL
        ORDER BY cambridge_book, section_number
    LOOP
        current_number := 1;
        
        -- Update questions in order of part_number and original question_number
        FOR question_rec IN
            SELECT id 
            FROM reading_questions 
            WHERE cambridge_book = rec.cambridge_book 
            AND section_number = rec.section_number
            ORDER BY part_number, question_number
        LOOP
            UPDATE reading_questions 
            SET question_number = current_number 
            WHERE id = question_rec.id;
            
            current_number := current_number + 1;
        END LOOP;
        
        RAISE NOTICE 'Updated numbering for % Section %', rec.cambridge_book, rec.section_number;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to fix existing data
SELECT update_question_numbering();

-- Create a simple profiles table for user authentication and progress tracking
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create table for test results to track progress across all parts
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL, -- 'reading', 'listening', 'speaking', 'writing'
  cambridge_book TEXT,
  section_number INTEGER,
  total_questions INTEGER,
  correct_answers INTEGER,
  score_percentage DECIMAL(5,2),
  time_taken INTEGER, -- in seconds
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  test_data JSONB -- Store detailed results
);

-- Enable RLS for test results
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Create policies for test results
CREATE POLICY "Users can view own test results" ON public.test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results" ON public.test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results" ON public.test_results
  FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();