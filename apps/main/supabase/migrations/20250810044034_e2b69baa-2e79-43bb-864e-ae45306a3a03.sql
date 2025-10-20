-- Create table for Sharpen Your Skills practice questions
CREATE TABLE IF NOT EXISTS public.skill_practice_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_type TEXT NOT NULL, -- exact skill name (e.g., "Vocabulary Builder")
  content TEXT NOT NULL,    -- question content
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT skill_practice_questions_skill_type_check CHECK (char_length(skill_type) > 0)
);

-- Enable Row Level Security
ALTER TABLE public.skill_practice_questions ENABLE ROW LEVEL SECURITY;

-- Policies (drop then create as IF NOT EXISTS is unsupported for policies)
DROP POLICY IF EXISTS "Public can read skill practice questions" ON public.skill_practice_questions;
CREATE POLICY "Public can read skill practice questions"
ON public.skill_practice_questions
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert skill practice questions" ON public.skill_practice_questions;
CREATE POLICY "Admins can insert skill practice questions"
ON public.skill_practice_questions
FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update skill practice questions" ON public.skill_practice_questions;
CREATE POLICY "Admins can update skill practice questions"
ON public.skill_practice_questions
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete skill practice questions" ON public.skill_practice_questions;
CREATE POLICY "Admins can delete skill practice questions"
ON public.skill_practice_questions
FOR DELETE
USING (public.is_admin());

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_update_skill_practice_questions_updated_at ON public.skill_practice_questions;
CREATE TRIGGER trg_update_skill_practice_questions_updated_at
BEFORE UPDATE ON public.skill_practice_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for skill_type lookups
CREATE INDEX IF NOT EXISTS idx_skill_practice_questions_skill_type
ON public.skill_practice_questions (skill_type);
