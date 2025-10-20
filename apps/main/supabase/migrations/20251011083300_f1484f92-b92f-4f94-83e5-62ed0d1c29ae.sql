-- Vocabulary feature: core tables and RLS policies

-- 1. Frequency reference table (public data)
CREATE TABLE IF NOT EXISTS public.vocab_frequency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL,
  lemma text NOT NULL,
  rank integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(language, lemma)
);

CREATE INDEX IF NOT EXISTS idx_vocab_frequency_language_rank ON public.vocab_frequency(language, rank);

ALTER TABLE public.vocab_frequency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Frequency data is viewable by everyone"
  ON public.vocab_frequency FOR SELECT
  USING (true);

-- 2. Decks table
CREATE TABLE IF NOT EXISTS public.vocab_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  level integer CHECK (level BETWEEN 1 AND 5),
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vocab_decks_user ON public.vocab_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_decks_public ON public.vocab_decks(is_public) WHERE is_public = true;

ALTER TABLE public.vocab_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own decks"
  ON public.vocab_decks FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own decks"
  ON public.vocab_decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
  ON public.vocab_decks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
  ON public.vocab_decks FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Cards table
CREATE TABLE IF NOT EXISTS public.vocab_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id uuid REFERENCES public.vocab_decks(id) ON DELETE CASCADE,
  term text NOT NULL,
  translation text NOT NULL,
  pos text,
  ipa text,
  context_sentence text,
  examples_json text[] DEFAULT '{}',
  conjugation jsonb,
  synonyms text[] DEFAULT '{}',
  frequency_rank integer,
  language text DEFAULT 'en',
  level integer CHECK (level BETWEEN 1 AND 5),
  is_public boolean DEFAULT false,
  suspended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vocab_cards_user ON public.vocab_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_cards_deck ON public.vocab_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_vocab_cards_public ON public.vocab_cards(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_vocab_cards_term ON public.vocab_cards(term);

ALTER TABLE public.vocab_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards"
  ON public.vocab_cards FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own cards"
  ON public.vocab_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
  ON public.vocab_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
  ON public.vocab_cards FOR DELETE
  USING (auth.uid() = user_id);

-- 4. SRS state table (spaced repetition)
CREATE TABLE IF NOT EXISTS public.vocab_srs_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.vocab_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ease numeric DEFAULT 2.5,
  interval_days integer DEFAULT 0,
  stability numeric,
  difficulty numeric,
  last_reviewed_at timestamptz,
  next_due_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_vocab_srs_user ON public.vocab_srs_state(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_srs_card ON public.vocab_srs_state(card_id);
CREATE INDEX IF NOT EXISTS idx_vocab_srs_due ON public.vocab_srs_state(next_due_at);

ALTER TABLE public.vocab_srs_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SRS state"
  ON public.vocab_srs_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SRS state"
  ON public.vocab_srs_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SRS state"
  ON public.vocab_srs_state FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Reviews history table
CREATE TABLE IF NOT EXISTS public.vocab_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.vocab_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 4),
  next_due_at_before timestamptz,
  next_due_at_after timestamptz,
  interval_days_before integer,
  interval_days_after integer,
  ease_before numeric,
  ease_after numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vocab_reviews_user ON public.vocab_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_reviews_card ON public.vocab_reviews(card_id);

ALTER TABLE public.vocab_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reviews"
  ON public.vocab_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reviews"
  ON public.vocab_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Jobs table for bulk seeding
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

CREATE POLICY "Users can view their own seed jobs"
  ON public.jobs_vocab_seed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seed jobs"
  ON public.jobs_vocab_seed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all seed jobs"
  ON public.jobs_vocab_seed FOR ALL
  USING (auth.role() = 'service_role');