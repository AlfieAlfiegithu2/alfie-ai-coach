-- Clean up duplicate tests and fix the naming properly
-- Delete the duplicate IELTS Test 2 (newer one that was incorrectly created)
DELETE FROM tests WHERE id = '07ff9851-3953-4464-b8ab-4fbf1ff4400f';

-- Make sure we have clean test names:
-- Test 1 should have writing questions (id: 36582d5b-51f2-4f4a-bec9-da7c24d8416a)
-- Test 2 should have reading questions (id: d3c740b0-9838-45fd-b076-e6fb1b8f6f6e)

-- Update the module field to be more generic since tests should support multiple modules
UPDATE tests SET module = 'general' WHERE test_type = 'IELTS';