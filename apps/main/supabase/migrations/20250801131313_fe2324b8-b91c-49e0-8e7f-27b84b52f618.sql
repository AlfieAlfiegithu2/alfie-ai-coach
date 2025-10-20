-- Fix RLS policies for speaking_prompts to allow admin access
DROP POLICY IF EXISTS "Only admins can manage speaking prompts" ON public.speaking_prompts;
DROP POLICY IF EXISTS "Speaking prompts are viewable by everyone" ON public.speaking_prompts;

-- Create proper RLS policies for speaking_prompts
CREATE POLICY "Admins can manage speaking prompts" 
ON public.speaking_prompts 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Speaking prompts are viewable by everyone" 
ON public.speaking_prompts 
FOR SELECT 
USING (true);

-- Add locked column to speaking_prompts for locking mechanism
ALTER TABLE public.speaking_prompts 
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;