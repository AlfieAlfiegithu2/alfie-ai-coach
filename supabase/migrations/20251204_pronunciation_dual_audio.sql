-- Migration: Add dual audio URLs for UK and US accents to pronunciation_items
-- This supports PTE-style Repeat Sentence with accent selection

-- Add new columns for UK and US audio URLs
ALTER TABLE pronunciation_items 
ADD COLUMN IF NOT EXISTS audio_url_uk TEXT,
ADD COLUMN IF NOT EXISTS audio_url_us TEXT;

-- Migrate existing audio_url data to audio_url_us (default to US accent for existing data)
UPDATE pronunciation_items 
SET audio_url_us = audio_url 
WHERE audio_url IS NOT NULL AND audio_url_us IS NULL;

-- For items marked as british accent, also copy to audio_url_uk
UPDATE pronunciation_items 
SET audio_url_uk = audio_url 
WHERE accent = 'british' AND audio_url IS NOT NULL AND audio_url_uk IS NULL;

-- Note: We keep the original audio_url and accent columns for backward compatibility
-- They can be removed in a future migration after verifying the new structure works

-- Add comment to document the new structure
COMMENT ON COLUMN pronunciation_items.audio_url_uk IS 'Audio URL for British (UK) accent pronunciation';
COMMENT ON COLUMN pronunciation_items.audio_url_us IS 'Audio URL for American (US) accent pronunciation';

