-- Fix RLS policies to allow admin operations via anonymous key with custom header
-- The issue: The admin uses localStorage for auth, not Supabase Auth
-- So auth.uid() is NULL and is_admin() returns false
-- Solution: Allow INSERT/UPDATE/DELETE with permissive policy for now

-- For development: Allow anyone to insert/update/delete tests
-- (In production, implement proper service role or auth mechanism)
DROP POLICY IF EXISTS "Allow admins to manage tests" ON public.tests;
CREATE POLICY "Allow managing tests"
ON public.tests
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow updating tests"
ON public.tests
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow deleting tests"
ON public.tests
FOR DELETE
USING (true);

-- Same for questions table
DROP POLICY IF EXISTS "Allow admins to manage questions" ON public.questions;
CREATE POLICY "Allow managing questions"
ON public.questions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow updating questions"
ON public.questions
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow deleting questions"
ON public.questions
FOR DELETE
USING (true);
