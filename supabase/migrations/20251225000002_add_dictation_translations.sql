-- Add translations column to dictation_sentences
ALTER TABLE dictation_sentences ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Policy update not strictly needed if we just select * and policies allow it, 
-- but ensuring it's available to read
