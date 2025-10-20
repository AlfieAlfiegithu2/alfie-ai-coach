-- Add rich data columns to vocab_translations table for POS, IPA, and context
ALTER TABLE vocab_translations ADD COLUMN IF NOT EXISTS pos TEXT;
ALTER TABLE vocab_translations ADD COLUMN IF NOT EXISTS ipa TEXT;
ALTER TABLE vocab_translations ADD COLUMN IF NOT EXISTS context_sentence TEXT;

-- Add indexes for efficient querying of rich data
CREATE INDEX IF NOT EXISTS idx_vocab_translations_pos ON vocab_translations(pos) WHERE pos IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vocab_translations_ipa ON vocab_translations(ipa) WHERE ipa IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vocab_translations_context ON vocab_translations(context_sentence) WHERE context_sentence IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN vocab_translations.pos IS 'Part of speech (noun, verb, adjective, etc.)';
COMMENT ON COLUMN vocab_translations.ipa IS 'International Phonetic Alphabet pronunciation';
COMMENT ON COLUMN vocab_translations.context_sentence IS 'Example sentence showing word usage in context';
