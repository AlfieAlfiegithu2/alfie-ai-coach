-- Add speaking test metadata columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mother_tongue TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS commercial_data_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS research_data_consent BOOLEAN DEFAULT false;

-- Add speaking test metadata columns to speaking_test_results table
ALTER TABLE speaking_test_results
ADD COLUMN IF NOT EXISTS mother_tongue TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS age_group TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS r2_key TEXT,
ADD COLUMN IF NOT EXISTS question_index INTEGER,
ADD COLUMN IF NOT EXISTS commercial_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS research_consent BOOLEAN DEFAULT false;