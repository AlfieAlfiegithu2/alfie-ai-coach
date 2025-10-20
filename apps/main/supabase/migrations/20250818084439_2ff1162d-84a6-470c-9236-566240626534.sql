-- Add skill_category column to tests table
ALTER TABLE public.tests 
ADD COLUMN skill_category TEXT;

-- Add a check constraint to ensure only valid skill categories
ALTER TABLE public.tests 
ADD CONSTRAINT valid_skill_category 
CHECK (skill_category IN ('Listening', 'Reading', 'Writing', 'Speaking'));

-- Update existing IELTS tests with appropriate skill categories
-- We'll set them based on module names for now
UPDATE public.tests 
SET skill_category = 
  CASE 
    WHEN module ILIKE '%listening%' THEN 'Listening'
    WHEN module ILIKE '%reading%' THEN 'Reading'
    WHEN module ILIKE '%writing%' THEN 'Writing'
    WHEN module ILIKE '%speaking%' THEN 'Speaking'
    ELSE 'Reading' -- Default fallback
  END
WHERE test_type = 'IELTS';