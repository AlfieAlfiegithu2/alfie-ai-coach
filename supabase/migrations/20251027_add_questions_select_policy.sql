-- Ensure questions can be read by admin pages and students
-- Adds a safe SELECT policy on public.questions

-- Enable RLS (no-op if already enabled)
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN
  -- ignore if table does not exist or already enabled
  NULL;
END $$;

-- Create a public read policy if it does not already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'questions'
      AND policyname = 'Questions are viewable by everyone'
  ) THEN
    CREATE POLICY "Questions are viewable by everyone"
    ON public.questions
    FOR SELECT
    USING (true);
  END IF;
END $$;


