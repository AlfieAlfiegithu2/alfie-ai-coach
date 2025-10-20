-- Create user_skill_progress table for per-user level unlocking across skills
CREATE TABLE IF NOT EXISTS public.user_skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_slug TEXT NOT NULL,
  max_unlocked_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_skill UNIQUE (user_id, skill_slug)
);

-- Enable Row Level Security
ALTER TABLE public.user_skill_progress ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own progress
CREATE POLICY "Users can view their own skill progress"
ON public.user_skill_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skill progress"
ON public.user_skill_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill progress"
ON public.user_skill_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_user_skill_progress_updated_at
BEFORE UPDATE ON public.user_skill_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();