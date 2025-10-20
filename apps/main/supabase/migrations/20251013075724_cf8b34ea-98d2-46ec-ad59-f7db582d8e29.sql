-- Ensure vocab_translation_queue table structure is correct
CREATE TABLE IF NOT EXISTS public.vocab_translation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NOT NULL,
  term TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_translation_queue_status ON public.vocab_translation_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_translation_queue_card ON public.vocab_translation_queue(card_id, target_lang);
CREATE INDEX IF NOT EXISTS idx_translation_queue_user ON public.vocab_translation_queue(user_id);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'vocab_translation_queue' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.vocab_translation_queue ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Ensure vocab_translations table exists
CREATE TABLE IF NOT EXISTS public.vocab_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NOT NULL,
  lang TEXT NOT NULL,
  translations TEXT[] NOT NULL DEFAULT '{}',
  provider TEXT,
  quality INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, lang)
);

-- Create indexes for vocab_translations
CREATE INDEX IF NOT EXISTS idx_vocab_translations_card ON public.vocab_translations(card_id);
CREATE INDEX IF NOT EXISTS idx_vocab_translations_lang ON public.vocab_translations(lang);
CREATE INDEX IF NOT EXISTS idx_vocab_translations_user ON public.vocab_translations(user_id);

-- Enable RLS on vocab_translations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'vocab_translations' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.vocab_translations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;