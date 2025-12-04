-- NCLEX Test Portal Schema
-- Creates tables for NCLEX practice tests with support for SATA (Select All That Apply) and MCQ questions

-- NCLEX Tests table - Test containers
CREATE TABLE IF NOT EXISTS nclex_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General', -- e.g., "Medical-Surgical", "Pediatrics", "Maternity", "Mental Health"
    difficulty_level TEXT DEFAULT 'Medium', -- Easy, Medium, Hard
    time_limit_minutes INTEGER DEFAULT 60,
    is_published BOOLEAN DEFAULT FALSE,
    question_count INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NCLEX Questions table - Individual questions
CREATE TABLE IF NOT EXISTS nclex_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES nclex_tests(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'MCQ', -- 'SATA' (Select All That Apply) or 'MCQ' (Multiple Choice)
    options JSONB NOT NULL DEFAULT '[]', -- Array of option strings
    correct_answers JSONB NOT NULL DEFAULT '[]', -- Array of correct answer indices (supports multiple for SATA)
    rationale TEXT, -- Explanation for the correct answer
    original_text TEXT, -- Pre-AI modification text for reference
    is_modified BOOLEAN DEFAULT FALSE, -- Whether AI modification was applied
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NCLEX Test Results table - Student attempts
CREATE TABLE IF NOT EXISTS nclex_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID REFERENCES nclex_tests(id) ON DELETE CASCADE,
    score DECIMAL(5,2), -- Percentage score
    correct_count INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    answers_data JSONB DEFAULT '[]', -- Array of {question_id, selected_answers, is_correct, time_spent}
    time_taken_seconds INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nclex_questions_test_id ON nclex_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_nclex_questions_number ON nclex_questions(test_id, question_number);
CREATE INDEX IF NOT EXISTS idx_nclex_test_results_user ON nclex_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_nclex_test_results_test ON nclex_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_nclex_tests_category ON nclex_tests(category);
CREATE INDEX IF NOT EXISTS idx_nclex_tests_published ON nclex_tests(is_published);

-- Row Level Security Policies
ALTER TABLE nclex_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE nclex_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nclex_test_results ENABLE ROW LEVEL SECURITY;

-- NCLEX Tests policies
CREATE POLICY "Anyone can view published NCLEX tests"
    ON nclex_tests FOR SELECT
    USING (is_published = true);

CREATE POLICY "Admins can manage all NCLEX tests"
    ON nclex_tests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- NCLEX Questions policies
CREATE POLICY "Anyone can view questions for published tests"
    ON nclex_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nclex_tests 
            WHERE nclex_tests.id = nclex_questions.test_id 
            AND nclex_tests.is_published = true
        )
    );

CREATE POLICY "Admins can manage all NCLEX questions"
    ON nclex_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- NCLEX Test Results policies
CREATE POLICY "Users can view their own NCLEX results"
    ON nclex_test_results FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own NCLEX results"
    ON nclex_test_results FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all NCLEX results"
    ON nclex_test_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Function to update question count on nclex_tests
CREATE OR REPLACE FUNCTION update_nclex_question_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        UPDATE nclex_tests 
        SET question_count = (
            SELECT COUNT(*) FROM nclex_questions WHERE test_id = COALESCE(NEW.test_id, OLD.test_id)
        ),
        updated_at = NOW()
        WHERE id = COALESCE(NEW.test_id, OLD.test_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update question count
DROP TRIGGER IF EXISTS nclex_question_count_trigger ON nclex_questions;
CREATE TRIGGER nclex_question_count_trigger
    AFTER INSERT OR DELETE ON nclex_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_nclex_question_count();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_nclex_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nclex_tests_updated_at ON nclex_tests;
CREATE TRIGGER nclex_tests_updated_at
    BEFORE UPDATE ON nclex_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_nclex_updated_at();

DROP TRIGGER IF EXISTS nclex_questions_updated_at ON nclex_questions;
CREATE TRIGGER nclex_questions_updated_at
    BEFORE UPDATE ON nclex_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_nclex_updated_at();

