-- ============================================
-- MIGRATION: Add test_subtype column
-- ============================================
-- Copy and paste this entire SQL into Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cuumxmfzhwljylbdlflj/sql/new
-- ============================================

ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS test_subtype TEXT;

ALTER TABLE public.tests
DROP CONSTRAINT IF EXISTS valid_test_subtype;

ALTER TABLE public.tests
ADD CONSTRAINT valid_test_subtype
CHECK (
  (skill_category = 'Writing' AND test_subtype IN ('Academic', 'General')) OR
  (skill_category != 'Writing' AND test_subtype IS NULL) OR
  test_subtype IS NULL
);

UPDATE public.tests
SET test_subtype = 'Academic'
WHERE skill_category = 'Writing' AND test_subtype IS NULL;

-- ============================================
-- After running this, try creating a General test again
-- ============================================

