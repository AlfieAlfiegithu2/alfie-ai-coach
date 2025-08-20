-- Add a test_category field to distinguish between individual skill tests and whole tests
ALTER TABLE tests ADD COLUMN test_category text DEFAULT 'individual';

-- Update existing whole tests to be marked as 'whole'
UPDATE tests 
SET test_category = 'whole' 
WHERE test_name ILIKE '%IELTS TEST %' 
   AND test_name NOT ILIKE '%Writing Test%' 
   AND test_name NOT ILIKE '%Reading Test%' 
   AND test_name NOT ILIKE '%Listening Test%' 
   AND test_name NOT ILIKE '%Speaking Test%';

-- Update individual skill tests to be marked as 'individual'
UPDATE tests 
SET test_category = 'individual' 
WHERE test_name ILIKE '%Writing Test%' 
   OR test_name ILIKE '%Reading Test%' 
   OR test_name ILIKE '%Listening Test%' 
   OR test_name ILIKE '%Speaking Test%';