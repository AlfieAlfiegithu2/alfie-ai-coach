-- STEP 1: Drop all old tables to ensure a clean slate.
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.tests CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
-- Add any other old/legacy tables here if they exist, e.g., reading_questions

-- STEP 2: Create the new, correct universal tables.
CREATE TABLE public.tests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name text NOT NULL,
    test_type text NOT NULL, -- e.g., "IELTS", "PTE"
    module text NOT NULL, -- e.g., "Reading", "Listening"
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    part_number integer NOT NULL,
    question_number_in_part integer NOT NULL,
    question_text text NOT NULL,
    question_type text NOT NULL,
    choices text,
    correct_answer text NOT NULL,
    explanation text,
    passage_text text,
    audio_url text,
    image_url text,
    transcription text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- STEP 3: Create a new profiles table WITH the 'role' column.
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    role text DEFAULT 'user'::text, -- ADDING THE CRITICAL 'role' COLUMN
    subscription_status text DEFAULT 'free'::text,
    native_language text DEFAULT 'English'::text,
    created_at timestamptz DEFAULT now()
);

-- STEP 4: Create the RLS helper function to check for the 'admin' role.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This now correctly checks the 'role' column in the 'profiles' table.
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- STEP 5: Apply new, correct RLS policies.
-- Policies for 'tests' table
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to tests" ON public.tests;
CREATE POLICY "Allow public read access to tests" ON public.tests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admins to manage tests" ON public.tests;
CREATE POLICY "Allow admins to manage tests" ON public.tests FOR ALL USING (is_admin());

-- Policies for 'questions' table
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
CREATE POLICY "Allow public read access to questions" ON public.questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admins to manage questions" ON public.questions;
CREATE POLICY "Allow admins to manage questions" ON public.questions FOR ALL USING (is_admin());