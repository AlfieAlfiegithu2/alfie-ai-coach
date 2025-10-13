-- Remove duplicate vocab_cards, keeping only the oldest entry per term
-- This will significantly reduce the 14,303 cards that have massive duplicates

WITH ranked_cards AS (
  SELECT 
    id,
    term,
    ROW_NUMBER() OVER (PARTITION BY term ORDER BY created_at ASC, id ASC) as rn
  FROM vocab_cards
),
duplicates_to_delete AS (
  SELECT id FROM ranked_cards WHERE rn > 1
)
DELETE FROM vocab_cards
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Create index on term for faster lookups
CREATE INDEX IF NOT EXISTS idx_vocab_cards_term ON vocab_cards(term);

-- Create a function to auto-translate new vocab cards
CREATE OR REPLACE FUNCTION auto_translate_vocab_card()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for public cards
  IF NEW.is_public = true THEN
    -- Call the batch translate function asynchronously via pg_notify
    PERFORM pg_notify(
      'vocab_translation_needed',
      json_build_object(
        'card_id', NEW.id,
        'term', NEW.term
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-translation on insert
DROP TRIGGER IF EXISTS trigger_auto_translate_vocab ON vocab_cards;
CREATE TRIGGER trigger_auto_translate_vocab
  AFTER INSERT ON vocab_cards
  FOR EACH ROW
  EXECUTE FUNCTION auto_translate_vocab_card();