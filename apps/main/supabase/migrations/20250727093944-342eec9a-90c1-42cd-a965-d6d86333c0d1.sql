-- Fix the difficulty_level constraint to include 'intermediate' and other common IELTS levels
ALTER TABLE public.reading_passages DROP CONSTRAINT reading_passages_difficulty_level_check;

-- Add updated constraint with more comprehensive difficulty levels
ALTER TABLE public.reading_passages ADD CONSTRAINT reading_passages_difficulty_level_check 
CHECK (difficulty_level = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text, 'intermediate'::text, 'beginner'::text, 'advanced'::text, 'band_4'::text, 'band_5'::text, 'band_6'::text, 'band_7'::text, 'band_8'::text, 'band_9'::text]));

-- Similarly update listening_sections if it has a similar constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listening_sections_difficulty_level_check') THEN
        ALTER TABLE public.listening_sections DROP CONSTRAINT listening_sections_difficulty_level_check;
        ALTER TABLE public.listening_sections ADD CONSTRAINT listening_sections_difficulty_level_check 
        CHECK (difficulty_level = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text, 'intermediate'::text, 'beginner'::text, 'advanced'::text, 'band_4'::text, 'band_5'::text, 'band_6'::text, 'band_7'::text, 'band_8'::text, 'band_9'::text]));
    END IF;
END $$;