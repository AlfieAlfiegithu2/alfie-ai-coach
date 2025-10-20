-- Fix RLS so admins/users can enqueue translation jobs from the UI
-- and ensure queue/process functions can continue working

-- 1) Create explicit INSERT policy for users on vocab_translation_queue (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'vocab_translation_queue' 
      AND policyname = 'Users can enqueue own translation jobs'
  ) THEN
    CREATE POLICY "Users can enqueue own translation jobs"
    ON public.vocab_translation_queue
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2) Ensure users can view only their own jobs (keep existing if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'vocab_translation_queue' 
      AND policyname = 'Users can view their own translation jobs'
  ) THEN
    CREATE POLICY "Users can view their own translation jobs"
    ON public.vocab_translation_queue
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3) Keep service role full access for background processors (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'vocab_translation_queue' 
      AND policyname = 'Service role can manage all translation jobs'
  ) THEN
    CREATE POLICY "Service role can manage all translation jobs"
    ON public.vocab_translation_queue
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 4) Optionally allow edge readers to view pending jobs without auth (read-only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'vocab_translation_queue' 
      AND policyname = 'Edge functions can read pending jobs'
  ) THEN
    CREATE POLICY "Edge functions can read pending jobs"
    ON public.vocab_translation_queue
    FOR SELECT
    USING (status = 'pending');
  END IF;
END $$;
