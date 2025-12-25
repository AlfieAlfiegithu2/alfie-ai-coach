-- Add is_published column to tests table for controlling visibility in student portal
-- Default to false so new tests are hidden until explicitly published

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tests_is_published ON tests(is_published);

-- Update existing tests to be published (so they remain visible after migration)
UPDATE tests SET is_published = true WHERE is_published IS NULL;

COMMENT ON COLUMN tests.is_published IS 'Controls whether test is visible to students in the portal. Default false for new tests.';
