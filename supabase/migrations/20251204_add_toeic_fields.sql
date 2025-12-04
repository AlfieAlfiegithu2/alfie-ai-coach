-- Add TOEIC-specific fields to the questions table
-- This migration adds fields to support TOEIC test structure (Parts 1-7)

-- Add toeic_part column to distinguish TOEIC parts (1-7)
-- Parts 1-4: Listening, Parts 5-7: Reading
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS toeic_part INTEGER;

-- Add passage_context for storing reading passages (Part 6 & 7)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS passage_context TEXT;

-- Add related_passage_id to link multiple questions to the same passage
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS related_passage_id UUID REFERENCES questions(id);

-- Add question_subtype for more specific TOEIC question categorization
-- e.g., 'incomplete_sentence', 'text_completion', 'single_passage', 'double_passage'
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question_subtype TEXT;

-- Add photo_url for TOEIC Listening Part 1 (Photos)
-- Reusing existing image_url field for this purpose

-- Add ai_explanation for DeepSeek-generated explanations
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS ai_explanation TEXT;

-- Add explanation_generated_at to track when AI explanation was generated
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS explanation_generated_at TIMESTAMPTZ;

-- Add test_category to tests table if not exists (for TOEIC: 'Listening' or 'Reading')
-- This already exists in the schema

-- Create index for efficient TOEIC queries
CREATE INDEX IF NOT EXISTS idx_questions_toeic_part ON questions(toeic_part) WHERE toeic_part IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_related_passage ON questions(related_passage_id) WHERE related_passage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_test_type_part ON questions(test_id, toeic_part);

-- Create TOEIC passages table for storing reading passages separately
CREATE TABLE IF NOT EXISTS toeic_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    part_number INTEGER NOT NULL CHECK (part_number BETWEEN 5 AND 7),
    passage_type TEXT NOT NULL, -- 'single', 'double', 'triple' for Part 7
    passage_title TEXT,
    passage_content TEXT NOT NULL,
    passage_image_url TEXT, -- For passages that include images (notices, ads, etc.)
    question_range_start INTEGER, -- e.g., 147
    question_range_end INTEGER, -- e.g., 150
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on toeic_passages
CREATE INDEX IF NOT EXISTS idx_toeic_passages_test_id ON toeic_passages(test_id);
CREATE INDEX IF NOT EXISTS idx_toeic_passages_part ON toeic_passages(part_number);

-- Add RLS policies for toeic_passages
ALTER TABLE toeic_passages ENABLE ROW LEVEL SECURITY;

-- Allow read access for everyone (public tests)
CREATE POLICY "Allow read access on toeic_passages" ON toeic_passages
    FOR SELECT USING (true);

-- Allow insert/update/delete for authenticated users (admins handle this via edge functions)
CREATE POLICY "Allow admin write access on toeic_passages" ON toeic_passages
    FOR ALL USING (true);

COMMENT ON TABLE toeic_passages IS 'Stores TOEIC reading passages for Parts 5-7';
COMMENT ON COLUMN questions.toeic_part IS 'TOEIC part number: 1-4 for Listening, 5-7 for Reading';
COMMENT ON COLUMN questions.passage_context IS 'Inline passage content for text completion questions';
COMMENT ON COLUMN questions.related_passage_id IS 'Links question to another question that contains the main passage';
COMMENT ON COLUMN questions.question_subtype IS 'TOEIC-specific: incomplete_sentence, text_completion, single_passage, double_passage, triple_passage';
COMMENT ON COLUMN questions.ai_explanation IS 'AI-generated explanation for why the answer is correct';

