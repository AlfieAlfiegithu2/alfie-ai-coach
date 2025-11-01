-- Ensure user_skill_progress has correct RLS policies deployed

-- Enable RLS (no-op if already enabled)
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.user_skill_progress ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Drop duplicate policies safely (if exist) to avoid conflicts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_skill_progress' AND policyname='Users can view their own skill progress'
  ) THEN
    DROP POLICY "Users can view their own skill progress" ON public.user_skill_progress;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_skill_progress' AND policyname='Users can insert their own skill progress'
  ) THEN
    DROP POLICY "Users can insert their own skill progress" ON public.user_skill_progress;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_skill_progress' AND policyname='Users can update their own skill progress'
  ) THEN
    DROP POLICY "Users can update their own skill progress" ON public.user_skill_progress;
  END IF;
END $$;

-- Recreate policies
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



