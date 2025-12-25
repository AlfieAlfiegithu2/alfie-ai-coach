-- Add is_published column if it doesn't exist (failsafe)
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Change the default value to TRUE so all new tests are visible by default
ALTER TABLE tests ALTER COLUMN is_published SET DEFAULT true;

-- Update ALL existing tests to be visible
UPDATE tests SET is_published = true;
