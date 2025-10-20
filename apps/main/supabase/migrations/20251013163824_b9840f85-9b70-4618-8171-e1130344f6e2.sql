-- Enforce uniqueness to prevent future public duplicates (same English term)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_public_vocab_term_lang
ON public.vocab_cards(term, language)
WHERE is_public = true;