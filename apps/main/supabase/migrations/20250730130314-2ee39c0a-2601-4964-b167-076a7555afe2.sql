-- First, create a helper function to check if a user is an admin
-- This assumes you have a 'profiles' table with a 'role' column.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is authenticated and has the 'admin' role
  RETURN (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin';
END;
$$;

-- Drop all existing RLS policies on the 'tests' and 'questions' tables to start clean
DROP POLICY IF EXISTS "Tests are viewable by everyone" ON public.tests;
DROP POLICY IF EXISTS "Only admins can manage tests" ON public.tests;
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Only admins can manage questions" ON public.questions;

-- Create New, Correct RLS Policies

-- Policies for the 'tests' table
CREATE POLICY "Allow public read access to tests" ON public.tests
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage tests" ON public.tests
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Policies for the 'questions' table
CREATE POLICY "Allow public read access to questions" ON public.questions
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage questions" ON public.questions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());