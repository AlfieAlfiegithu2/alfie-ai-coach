-- Clean up inconsistent test data
-- Fix the test with null skill_category
UPDATE tests 
SET skill_category = 'Writing', module = 'academic' 
WHERE id = '64fe93e4-8b91-44fc-aa7f-fe7c424358b0' AND skill_category IS NULL;

-- Standardize module field for consistency
UPDATE tests 
SET module = 'academic' 
WHERE test_type = 'IELTS' AND module IN ('Writing', 'Speaking') AND skill_category IS NOT NULL;