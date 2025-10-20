-- Create tables for Pronunciation practice
-- 1) pronunciation_tests: a container (like vocabulary tests) that groups items
-- 2) pronunciation_items: each item has a reference text and an audio file url (voice-over)

-- Create pronunciation_tests table
CREATE TABLE IF NOT EXISTS public.pronunciation_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create pronunciation_items table
CREATE TABLE IF NOT EXISTS public.pronunciation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.pronunciation_tests(id) ON DELETE CASCADE,
  reference_text text NOT NULL,
  audio_url text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pronunciation_items_test_id ON public.pronunciation_items(test_id);
CREATE INDEX IF NOT EXISTS idx_pronunciation_items_order ON public.pronunciation_items(test_id, order_index);

-- Timestamp trigger function (reuse existing if present)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trg_pronunciation_tests_updated_at ON public.pronunciation_tests;
CREATE TRIGGER trg_pronunciation_tests_updated_at
BEFORE UPDATE ON public.pronunciation_tests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pronunciation_items_updated_at ON public.pronunciation_items;
CREATE TRIGGER trg_pronunciation_items_updated_at
BEFORE UPDATE ON public.pronunciation_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.pronunciation_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pronunciation_items ENABLE ROW LEVEL SECURITY;

-- Policies
-- Tests: Public can read only published tests; admins can manage; creators can manage their own
DROP POLICY IF EXISTS "Public can read published tests" ON public.pronunciation_tests;
CREATE POLICY "Public can read published tests"
ON public.pronunciation_tests FOR SELECT
USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage tests" ON public.pronunciation_tests;
CREATE POLICY "Admins can manage tests"
ON public.pronunciation_tests FOR ALL
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Creators can manage their tests" ON public.pronunciation_tests;
CREATE POLICY "Creators can manage their tests"
ON public.pronunciation_tests FOR ALL
USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Items: Public can read items of published tests; admins manage; creators manage via their test
DROP POLICY IF EXISTS "Public can read items of published tests" ON public.pronunciation_items;
CREATE POLICY "Public can read items of published tests"
ON public.pronunciation_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pronunciation_tests t
    WHERE t.id = pronunciation_items.test_id AND t.is_published = true
  )
);

DROP POLICY IF EXISTS "Admins can manage items" ON public.pronunciation_items;
CREATE POLICY "Admins can manage items"
ON public.pronunciation_items FOR ALL
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Creators can manage items for own tests" ON public.pronunciation_items;
CREATE POLICY "Creators can manage items for own tests"
ON public.pronunciation_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.pronunciation_tests t
    WHERE t.id = pronunciation_items.test_id AND t.created_by = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pronunciation_tests t
    WHERE t.id = pronunciation_items.test_id AND t.created_by = auth.uid()
  )
);

-- Optional: results table for storing analyses (kept simple, public can insert own result, read own)
CREATE TABLE IF NOT EXISTS public.pronunciation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_id uuid,
  item_id uuid,
  overall_score int,
  analysis_json jsonb,
  audio_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pronunciation_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own results" ON public.pronunciation_results;
CREATE POLICY "Users can insert their own results"
ON public.pronunciation_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read their own results" ON public.pronunciation_results;
CREATE POLICY "Users can read their own results"
ON public.pronunciation_results FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all results" ON public.pronunciation_results;
CREATE POLICY "Admins can read all results"
ON public.pronunciation_results FOR SELECT
USING (public.is_admin());
