-- Update existing IELTS test to use generic naming convention
UPDATE tests 
SET test_name = 'IELTS Test 1'
WHERE id = '36582d5b-51f2-4f4a-bec9-da7c24d8416a' AND test_name = 'IELTS Writing Test 1';

-- Also, let's remove the module constraint since tests should be generic and support multiple modules
-- We'll keep the module field for now but it will be more of a reference field