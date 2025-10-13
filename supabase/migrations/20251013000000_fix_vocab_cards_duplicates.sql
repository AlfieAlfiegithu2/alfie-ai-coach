-- Fix vocabulary cards duplicate issues
-- This migration:
-- 1. Removes duplicate words (keeping the oldest entry for each term)
-- 2. Adds a unique constraint to prevent future duplicates

-- Step 1: Remove duplicate words for public cards
-- Keep the oldest card for each term when is_public = true
WITH ranked_cards AS (
  SELECT 
    id,
    term,
    user_id,
    is_public,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(term)), is_public 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM public.vocab_cards
  WHERE is_public = true
)
DELETE FROM public.vocab_cards
WHERE id IN (
  SELECT id FROM ranked_cards WHERE rn > 1
);

-- Step 2: Create a partial unique index for public vocabulary
-- This prevents duplicates for public words while allowing users to have their own versions
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocab_cards_unique_public_term 
ON public.vocab_cards(LOWER(TRIM(term))) 
WHERE is_public = true;

-- Step 3: Create an index to improve duplicate checking performance
CREATE INDEX IF NOT EXISTS idx_vocab_cards_term_normalized 
ON public.vocab_cards(LOWER(TRIM(term)), is_public);

-- Step 4: Add a comment explaining the constraint
COMMENT ON INDEX idx_vocab_cards_unique_public_term IS 
'Ensures that public vocabulary cards have unique terms (case-insensitive, trimmed). Users can still create personal versions of the same word.';

