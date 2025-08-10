-- 1) Create a table for skill tests (to group questions per test)
CREATE TABLE IF NOT EXISTS public.skill_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_slug text NOT NULL,
  title text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_tests ENABLE ROW LEVEL SECURITY;

-- Policies: public read, admins manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skill_tests' AND policyname = 'Public can view skill tests'
  ) THEN
    CREATE POLICY "Public can view skill tests"
    ON public.skill_tests
    FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skill_tests' AND policyname = 'Admins can insert skill tests'
  ) THEN
    CREATE POLICY "Admins can insert skill tests"
    ON public.skill_tests
    FOR INSERT
    WITH CHECK (is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skill_tests' AND policyname = 'Admins can update skill tests'
  ) THEN
    CREATE POLICY "Admins can update skill tests"
    ON public.skill_tests
    FOR UPDATE
    USING (is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'skill_tests' AND policyname = 'Admins can delete skill tests'
  ) THEN
    CREATE POLICY "Admins can delete skill tests"
    ON public.skill_tests
    FOR DELETE
    USING (is_admin());
  END IF;
END $$;

-- Trigger for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_skill_tests_updated_at'
  ) THEN
    CREATE TRIGGER update_skill_tests_updated_at
    BEFORE UPDATE ON public.skill_tests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Alter existing table to support vocabulary formats and test linkage
ALTER TABLE public.skill_practice_questions
  ADD COLUMN IF NOT EXISTS skill_test_id uuid REFERENCES public.skill_tests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS question_format text,
  ADD COLUMN IF NOT EXISTS correct_answer text,
  ADD COLUMN IF NOT EXISTS incorrect_answers text[] DEFAULT '{}'::text[];

-- Optional index for performance
CREATE INDEX IF NOT EXISTS idx_skill_practice_questions_skill_test
  ON public.skill_practice_questions (skill_test_id);
