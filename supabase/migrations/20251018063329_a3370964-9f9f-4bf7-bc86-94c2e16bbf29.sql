-- Create table for per-language enrichment data
CREATE TABLE IF NOT EXISTS public.vocab_translation_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL,
  lang TEXT NOT NULL,
  translation TEXT,
  pos TEXT,
  ipa TEXT,
  context TEXT,
  examples_json JSONB,
  synonyms_json JSONB,
  conjugation JSONB,
  provider TEXT,
  quality INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_card_lang UNIQUE (card_id, lang)
);

-- Enable RLS and add policies
ALTER TABLE public.vocab_translation_enrichments ENABLE ROW LEVEL SECURITY;

-- Viewable by everyone
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vocab_translation_enrichments' AND policyname = 'Enrichments are viewable by everyone'
  ) THEN
    CREATE POLICY "Enrichments are viewable by everyone"
    ON public.vocab_translation_enrichments
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Service role can manage (insert/update/delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vocab_translation_enrichments' AND policyname = 'Service role can manage enrichments'
  ) THEN
    CREATE POLICY "Service role can manage enrichments"
    ON public.vocab_translation_enrichments
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vte_updated_at'
  ) THEN
    CREATE TRIGGER trg_vte_updated_at
    BEFORE UPDATE ON public.vocab_translation_enrichments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;