-- Fix test names to match their content
-- Test with writing content should be "IELTS Writing Test"
-- Test with reading content should be "IELTS Reading Test"

UPDATE tests 
SET test_name = 'IELTS Writing Test'
WHERE id = '36582d5b-51f2-4f4a-bec9-da7c24d8416a';

UPDATE tests 
SET test_name = 'IELTS Reading Test'
WHERE id = 'd3c740b0-9838-45fd-b076-e6fb1b8f6f6e';