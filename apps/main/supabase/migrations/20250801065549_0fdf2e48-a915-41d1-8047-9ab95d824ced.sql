-- Fix test names to match their actual order and content
-- The older test (d3c740b0-9838-45fd-b076-e6fb1b8f6f6e) should be "IELTS Test 1" 
-- The newer test (36582d5b-51f2-4f4a-bec9-da7c24d8416a) should be "IELTS Test 2"

UPDATE tests 
SET test_name = 'IELTS Test 1'
WHERE id = 'd3c740b0-9838-45fd-b076-e6fb1b8f6f6e';

UPDATE tests 
SET test_name = 'IELTS Test 2'
WHERE id = '36582d5b-51f2-4f4a-bec9-da7c24d8416a';