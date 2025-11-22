-- Add training_type field to tests table for Academic/General classification
ALTER TABLE tests ADD COLUMN training_type TEXT CHECK (training_type IN ('Academic', 'General'));

-- Add index for better query performance
CREATE INDEX idx_tests_training_type ON tests(training_type);

-- Update existing IELTS writing tests to default to Academic (most common)
UPDATE tests
SET training_type = 'Academic'
WHERE test_type = 'IELTS'
  AND (module = 'Writing' OR skill_category = 'Writing')
  AND training_type IS NULL;



