-- Fix vocabulary_words RLS policies to allow admins to read the table
-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Only service role can manage vocabulary words" ON public.vocabulary_words;

-- Keep the SELECT policy for everyone (this should have worked before but was overridden)
DROP POLICY IF EXISTS "Vocabulary words are viewable by everyone" ON public.vocabulary_words;

-- Create proper policies:
-- 1. Everyone can read vocabulary words (for SELECT operations)
CREATE POLICY "Vocabulary words are viewable by everyone" 
ON public.vocabulary_words 
FOR SELECT 
USING (true);

-- 2. Only service role can INSERT/UPDATE/DELETE
CREATE POLICY "Service role can manage vocabulary words" 
ON public.vocabulary_words 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update vocabulary words" 
ON public.vocabulary_words 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete vocabulary words" 
ON public.vocabulary_words 
FOR DELETE 
USING (auth.role() = 'service_role');
