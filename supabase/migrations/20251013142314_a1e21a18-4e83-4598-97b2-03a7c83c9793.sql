-- Fix system translations storage for vocab_translations
-- 1) Make user_id nullable to allow system-wide rows (user_id = NULL)
-- 2) Add is_system flag (default false) if missing
-- 3) Ensure translations schema pieces exist (provider, quality, created_at, updated_at)
-- 4) Ensure unique constraint on (card_id, lang) for upsert
-- 5) Enable/adjust RLS policies to allow:
--    - Users manage their own rows
--    - Service role manage all
--    - Public read system translations
-- 6) Updated-at trigger

-- 1) Allow NULL user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vocab_translations' AND column_name = 'user_id'
  ) THEN
    -- Drop NOT NULL only if currently set
    IF EXISTS (
      SELECT 1 FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = 'vocab_translations' AND a.attname = 'user_id' AND a.attnotnull
    ) THEN
      ALTER TABLE public.vocab_translations ALTER COLUMN user_id DROP NOT NULL;
    END IF;
  END IF;
END$$;

-- 2) Add is_system column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vocab_translations' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE public.vocab_translations ADD COLUMN is_system boolean NOT NULL DEFAULT false;
  END IF;
END$$;

-- 3) Ensure other columns exist (provider, quality, created_at, updated_at, translations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vocab_translations' AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.vocab_translations ADD COLUMN provider text;
    ALTER TABLE public.vocab_translations ALTER COLUMN provider SET DEFAULT 'deepseek';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vocab_translations' AND column_name = 'quality'
  ) THEN
    ALTER TABLE public.vocab_translations ADD COLUMN quality integer NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vocab_translations' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.vocab_translations ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vocab_translations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.vocab_translations ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;

  -- translations as text[] (array) used by edge function
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vocab_translations' AND column_name = 'translations'
  ) THEN
    ALTER TABLE public.vocab_translations ADD COLUMN translations text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END$$;

-- 4) Unique constraint for (card_id, lang) to support upsert ... onConflict: 'card_id,lang'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.vocab_translations'::regclass
      AND conname = 'vocab_translations_card_lang_key'
  ) THEN
    -- Ensure columns exist first
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vocab_translations' AND column_name='card_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vocab_translations' AND column_name='lang'
    ) THEN
      ALTER TABLE public.vocab_translations
        ADD CONSTRAINT vocab_translations_card_lang_key UNIQUE (card_id, lang);
    END IF;
  END IF;
END$$;

-- 5) RLS: enable and add policies
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.vocab_translations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN
  -- ignore if already enabled
  NULL;
END$$;

-- Users can manage own translations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='vocab_translations' 
      AND policyname='Users can manage own translations'
  ) THEN
    CREATE POLICY "Users can manage own translations" ON public.vocab_translations
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Service role can manage system translations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='vocab_translations' 
      AND policyname='Service role can manage system translations'
  ) THEN
    CREATE POLICY "Service role can manage system translations" ON public.vocab_translations
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;

-- Public can read system translations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='vocab_translations' 
      AND policyname='Public can read system translations'
  ) THEN
    CREATE POLICY "Public can read system translations" ON public.vocab_translations
      FOR SELECT
      USING (is_system = true);
  END IF;
END$$;

-- 6) updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_vocab_translations_updated_at'
  ) THEN
    CREATE TRIGGER trg_vocab_translations_updated_at
      BEFORE UPDATE ON public.vocab_translations
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;