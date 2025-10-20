-- Fix the universal questions table to add missing test_id foreign key
ALTER TABLE questions ADD CONSTRAINT fk_questions_test_id 
FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE;

-- Add test_id column to reading_questions and listening_questions for consistency
ALTER TABLE reading_questions ADD COLUMN test_id uuid;
ALTER TABLE listening_questions ADD COLUMN test_id uuid;

-- Add foreign key constraints
ALTER TABLE reading_questions ADD CONSTRAINT fk_reading_questions_test_id 
FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE;

ALTER TABLE listening_questions ADD CONSTRAINT fk_listening_questions_test_id 
FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE;

-- Update the admin-content Edge Function to handle module-specific question tables
-- This will be done in the code update