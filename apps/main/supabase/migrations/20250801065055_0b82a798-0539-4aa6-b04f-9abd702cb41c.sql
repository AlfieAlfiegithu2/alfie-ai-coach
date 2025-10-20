-- Update all IELTS tests to use 'academic' module instead of 'general'
UPDATE tests 
SET module = 'academic'
WHERE test_type = 'IELTS';