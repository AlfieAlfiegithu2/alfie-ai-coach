-- Remove difficulty_level columns from all tables
ALTER TABLE reading_passages DROP COLUMN IF EXISTS difficulty_level;
ALTER TABLE listening_sections DROP COLUMN IF EXISTS difficulty_level;
ALTER TABLE writing_prompts DROP COLUMN IF EXISTS difficulty_level;
ALTER TABLE speaking_prompts DROP COLUMN IF EXISTS difficulty_level;

-- Add photo_url column to listening_sections for visual questions
ALTER TABLE listening_sections ADD COLUMN IF NOT EXISTS photo_url TEXT;