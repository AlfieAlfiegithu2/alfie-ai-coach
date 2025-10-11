-- Create missing jobs_vocab_seed table

CREATE TABLE IF NOT EXISTS public.jobs_vocab_seed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total integer NOT NULL,
  completed integer DEFAULT 0,
  level integer,
  status text DEFAULT 'running',
  last_term text,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_vocab_seed_user ON public.jobs_vocab_seed(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_vocab_seed_status ON public.jobs_vocab_seed(status);

ALTER TABLE public.jobs_vocab_seed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own seed jobs" ON public.jobs_vocab_seed;
CREATE POLICY "Users can view their own seed jobs"
  ON public.jobs_vocab_seed FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own seed jobs" ON public.jobs_vocab_seed;
CREATE POLICY "Users can create their own seed jobs"
  ON public.jobs_vocab_seed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all seed jobs" ON public.jobs_vocab_seed;
CREATE POLICY "Service role can manage all seed jobs"
  ON public.jobs_vocab_seed FOR ALL
  USING (auth.role() = 'service_role');