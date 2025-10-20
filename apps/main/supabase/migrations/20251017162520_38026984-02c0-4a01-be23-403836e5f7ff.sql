-- Create queue table for vocabulary translations
CREATE TABLE IF NOT EXISTS public.vocab_translation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NOT NULL,
  term TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient processing
CREATE INDEX IF NOT EXISTS idx_vtq_status ON public.vocab_translation_queue (status);
CREATE INDEX IF NOT EXISTS idx_vtq_target_lang ON public.vocab_translation_queue (target_lang);
CREATE INDEX IF NOT EXISTS idx_vtq_card_id ON public.vocab_translation_queue (card_id);
CREATE INDEX IF NOT EXISTS idx_vtq_created_at ON public.vocab_translation_queue (created_at);

-- Enable Row Level Security
ALTER TABLE public.vocab_translation_queue ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  -- Admins can read queue
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'vocab_translation_queue' AND policyname = 'Admins can read translation queue'
  ) THEN
    CREATE POLICY "Admins can read translation queue" ON public.vocab_translation_queue
      FOR SELECT
      USING (public.is_admin());
  END IF;

  -- Service role can manage queue (insert/update/delete)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'vocab_translation_queue' AND policyname = 'Service role can manage translation queue'
  ) THEN
    CREATE POLICY "Service role can manage translation queue" ON public.vocab_translation_queue
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_vtq_updated_at'
  ) THEN
    CREATE TRIGGER set_vtq_updated_at
    BEFORE UPDATE ON public.vocab_translation_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
