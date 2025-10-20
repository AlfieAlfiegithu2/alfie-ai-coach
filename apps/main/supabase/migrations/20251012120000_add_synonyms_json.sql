-- Add missing synonyms_json column to vocab_cards table
ALTER TABLE vocab_cards ADD COLUMN IF NOT EXISTS synonyms_json jsonb DEFAULT '[]'::jsonb;

-- Add examples_json column if it doesn't exist
ALTER TABLE vocab_cards ADD COLUMN IF NOT EXISTS examples_json jsonb DEFAULT '[]'::jsonb;
