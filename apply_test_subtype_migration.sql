-- Add test_subtype column to tests table for Academic/General differentiation
ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS test_subtype TEXT;

-- Drop constraint if it exists to avoid errors
ALTER TABLE public.tests
DROP CONSTRAINT IF EXISTS valid_test_subtype;

-- Add a check constraint to ensure only valid test subtypes for Writing tests
ALTER TABLE public.tests
ADD CONSTRAINT valid_test_subtype
CHECK (
  (skill_category = 'Writing' AND test_subtype IN ('Academic', 'General')) OR
  (skill_category != 'Writing' AND test_subtype IS NULL) OR
  test_subtype IS NULL
);

-- Update existing Writing tests to default to Academic
UPDATE public.tests
SET test_subtype = 'Academic'
WHERE skill_category = 'Writing' AND test_subtype IS NULL;

