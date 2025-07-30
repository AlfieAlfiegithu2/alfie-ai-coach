-- Phase 1: Data Migration and Schema Cleanup

-- Step 1: Migrate data from reading_questions to universal questions table
INSERT INTO questions (
  test_id,
  question_text,
  question_type,
  correct_answer,
  choices,
  explanation,
  part_number,
  question_number_in_part,
  passage_text,
  created_at,
  updated_at
)
SELECT 
  rq.test_id,
  rq.question_text,
  rq.question_type,
  rq.correct_answer,
  CASE 
    WHEN rq.options IS NOT NULL THEN rq.options::text
    ELSE NULL
  END as choices,
  rq.explanation,
  rq.part_number,
  rq.question_number as question_number_in_part,
  rp.content as passage_text,
  rq.created_at,
  NOW() as updated_at
FROM reading_questions rq
LEFT JOIN reading_passages rp ON rq.passage_id = rp.id
WHERE rq.test_id IS NOT NULL;

-- Step 2: Migrate data from listening_questions to universal questions table
INSERT INTO questions (
  test_id,
  question_text,
  question_type,
  correct_answer,
  choices,
  explanation,
  part_number,
  question_number_in_part,
  audio_url,
  created_at,
  updated_at
)
SELECT 
  lq.test_id,
  lq.question_text,
  lq.question_type,
  lq.correct_answer,
  CASE 
    WHEN lq.options IS NOT NULL THEN lq.options::text
    ELSE NULL
  END as choices,
  lq.explanation,
  lq.part_number,
  lq.question_number as question_number_in_part,
  ls.audio_url,
  lq.created_at,
  NOW() as updated_at
FROM listening_questions lq
LEFT JOIN listening_sections ls ON lq.section_id = ls.id
WHERE lq.test_id IS NOT NULL;

-- Step 3: Add proper foreign key constraints
ALTER TABLE questions 
ADD CONSTRAINT fk_questions_test_id 
FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE;

ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_part_number ON questions(part_number);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Step 5: Update tests table with correct question counts
UPDATE tests 
SET total_questions = (
  SELECT COUNT(*) 
  FROM questions 
  WHERE questions.test_id = tests.id
);

-- Step 6: Drop legacy tables (after confirming data migration)
DROP TABLE IF EXISTS reading_questions CASCADE;
DROP TABLE IF EXISTS listening_questions CASCADE;
DROP TABLE IF EXISTS reading_passages CASCADE;
DROP TABLE IF EXISTS listening_sections CASCADE;
DROP TABLE IF EXISTS ielts_reading_tests CASCADE;