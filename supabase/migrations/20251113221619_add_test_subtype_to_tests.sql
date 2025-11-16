-- Add test_subtype column to tests table for Academic/General differentiation
ALTER TABLE public.tests
ADD COLUMN test_subtype TEXT;

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





