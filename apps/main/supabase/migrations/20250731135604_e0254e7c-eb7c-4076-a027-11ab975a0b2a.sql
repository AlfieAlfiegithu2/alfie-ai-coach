-- Fix case inconsistency in test_type and create proper IELTS Test 2
UPDATE tests 
SET test_type = 'IELTS' 
WHERE test_type = 'ielts';

-- Update the reading test to be "IELTS Test 2" since we already have "IELTS Test 1" for writing
UPDATE tests 
SET test_name = 'IELTS Test 2'
WHERE id = 'd3c740b0-9838-45fd-b076-e6fb1b8f6f6e' AND test_name = 'IELTS Test 1' AND module = 'reading';