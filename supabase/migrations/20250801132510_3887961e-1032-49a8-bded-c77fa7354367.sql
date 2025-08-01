-- Temporarily allow all authenticated users to manage speaking prompts for testing
DROP POLICY IF EXISTS "Admins can manage speaking prompts" ON public.speaking_prompts;

CREATE POLICY "Authenticated users can manage speaking prompts" 
ON public.speaking_prompts 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');