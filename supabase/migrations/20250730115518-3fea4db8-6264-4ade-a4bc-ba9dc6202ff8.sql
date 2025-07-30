-- Complete data migration and cleanup (skip existing constraints)

-- Step 1: Migrate remaining data from reading_questions if any
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
WHERE rq.test_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM questions q 
    WHERE q.test_id = rq.test_id 
    AND q.question_text = rq.question_text
  );

-- Step 2: Update tests table with correct question counts
UPDATE tests 
SET total_questions = (
  SELECT COUNT(*) 
  FROM questions 
  WHERE questions.test_id = tests.id
);

-- Step 3: Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_part_number ON questions(part_number);

-- Step 4: Drop legacy tables after data migration
DROP TABLE IF EXISTS reading_questions CASCADE;
DROP TABLE IF EXISTS listening_questions CASCADE;
DROP TABLE IF EXISTS reading_passages CASCADE;
DROP TABLE IF EXISTS listening_sections CASCADE;
DROP TABLE IF EXISTS ielts_reading_tests CASCADE;