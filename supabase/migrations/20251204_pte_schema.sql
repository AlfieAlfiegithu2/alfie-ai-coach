-- PTE Test Schema Migration
-- Adds fields to support the 22 PTE question types across 3 skill areas

-- Add pte_skill enum type if not exists
DO $$ BEGIN
    CREATE TYPE pte_skill AS ENUM ('speaking_writing', 'reading', 'listening');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add pte_section_type enum for all 22 question types
DO $$ BEGIN
    CREATE TYPE pte_section_type AS ENUM (
        -- Speaking & Writing (9 types)
        'read_aloud',
        'repeat_sentence', 
        'describe_image',
        'retell_lecture',
        'answer_short_question',
        'summarize_group_discussion',
        'respond_to_situation',
        'summarize_written_text',
        'write_essay',
        -- Reading (5 types)
        'fill_blanks_dropdown',
        'mcq_multiple_answers',
        'reorder_paragraph',
        'fill_blanks_drag_drop',
        'mcq_single_answer',
        -- Listening (8 types)
        'summarize_spoken_text',
        'listening_mcq_multiple',
        'fill_blanks_type_in',
        'highlight_correct_summary',
        'listening_mcq_single',
        'select_missing_word',
        'highlight_incorrect_words',
        'write_from_dictation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add PTE-specific columns to tests table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tests' AND column_name = 'pte_skill') THEN
        ALTER TABLE tests ADD COLUMN pte_skill TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tests' AND column_name = 'pte_section_type') THEN
        ALTER TABLE tests ADD COLUMN pte_section_type TEXT;
    END IF;
END $$;

-- Create PTE items table for Speaking/Writing prompts
CREATE TABLE IF NOT EXISTS public.pte_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pte_skill TEXT NOT NULL,
    pte_section_type TEXT NOT NULL,
    title TEXT,
    prompt_text TEXT NOT NULL,
    passage_text TEXT,
    image_url TEXT,
    audio_url TEXT,
    sample_answer TEXT,
    time_limit INTEGER DEFAULT 60,
    word_limit INTEGER,
    options JSONB,
    correct_answer TEXT,
    paragraphs JSONB, -- For reorder paragraph (array of paragraph objects with id and text)
    blanks JSONB, -- For fill in blanks (array of blank positions and correct answers)
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PTE listening tests table (one audio file, multiple question types)
CREATE TABLE IF NOT EXISTS public.pte_listening_tests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name TEXT NOT NULL,
    audio_url TEXT,
    transcript TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PTE listening questions table
CREATE TABLE IF NOT EXISTS public.pte_listening_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    listening_test_id UUID REFERENCES pte_listening_tests(id) ON DELETE CASCADE,
    pte_section_type TEXT NOT NULL,
    question_number INTEGER DEFAULT 1,
    prompt_text TEXT,
    passage_text TEXT,
    image_url TEXT,
    options JSONB,
    correct_answer TEXT,
    blanks JSONB,
    highlight_words JSONB, -- For highlight incorrect words
    audio_start_time INTEGER, -- Timestamp in seconds for segment start
    audio_end_time INTEGER, -- Timestamp in seconds for segment end
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PTE user progress table
CREATE TABLE IF NOT EXISTS public.pte_user_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    pte_skill TEXT NOT NULL,
    pte_section_type TEXT NOT NULL,
    item_id UUID,
    listening_test_id UUID,
    completed BOOLEAN DEFAULT false,
    score NUMERIC,
    response_text TEXT,
    response_audio_url TEXT,
    feedback JSONB,
    time_taken INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pte_items_skill ON pte_items(pte_skill);
CREATE INDEX IF NOT EXISTS idx_pte_items_section_type ON pte_items(pte_section_type);
CREATE INDEX IF NOT EXISTS idx_pte_listening_items_test ON pte_listening_items(listening_test_id);
CREATE INDEX IF NOT EXISTS idx_pte_listening_items_type ON pte_listening_items(pte_section_type);
CREATE INDEX IF NOT EXISTS idx_pte_user_progress_user ON pte_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_pte_user_progress_type ON pte_user_progress(pte_section_type);

-- Enable RLS
ALTER TABLE pte_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pte_listening_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pte_listening_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pte_user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pte_items (public read, admin write)
DROP POLICY IF EXISTS "PTE items are viewable by everyone" ON pte_items;
CREATE POLICY "PTE items are viewable by everyone" ON pte_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "PTE items can be created by authenticated users" ON pte_items;
CREATE POLICY "PTE items can be created by authenticated users" ON pte_items
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "PTE items can be updated by authenticated users" ON pte_items;
CREATE POLICY "PTE items can be updated by authenticated users" ON pte_items
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "PTE items can be deleted by authenticated users" ON pte_items;
CREATE POLICY "PTE items can be deleted by authenticated users" ON pte_items
    FOR DELETE USING (true);

-- RLS Policies for pte_listening_tests
DROP POLICY IF EXISTS "PTE listening tests are viewable by everyone" ON pte_listening_tests;
CREATE POLICY "PTE listening tests are viewable by everyone" ON pte_listening_tests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "PTE listening tests can be created by authenticated users" ON pte_listening_tests;
CREATE POLICY "PTE listening tests can be created by authenticated users" ON pte_listening_tests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "PTE listening tests can be updated by authenticated users" ON pte_listening_tests;
CREATE POLICY "PTE listening tests can be updated by authenticated users" ON pte_listening_tests
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "PTE listening tests can be deleted by authenticated users" ON pte_listening_tests;
CREATE POLICY "PTE listening tests can be deleted by authenticated users" ON pte_listening_tests
    FOR DELETE USING (true);

-- RLS Policies for pte_listening_items
DROP POLICY IF EXISTS "PTE listening items are viewable by everyone" ON pte_listening_items;
CREATE POLICY "PTE listening items are viewable by everyone" ON pte_listening_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "PTE listening items can be created by authenticated users" ON pte_listening_items;
CREATE POLICY "PTE listening items can be created by authenticated users" ON pte_listening_items
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "PTE listening items can be updated by authenticated users" ON pte_listening_items;
CREATE POLICY "PTE listening items can be updated by authenticated users" ON pte_listening_items
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "PTE listening items can be deleted by authenticated users" ON pte_listening_items;
CREATE POLICY "PTE listening items can be deleted by authenticated users" ON pte_listening_items
    FOR DELETE USING (true);

-- RLS Policies for pte_user_progress
DROP POLICY IF EXISTS "Users can view their own PTE progress" ON pte_user_progress;
CREATE POLICY "Users can view their own PTE progress" ON pte_user_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own PTE progress" ON pte_user_progress;
CREATE POLICY "Users can insert their own PTE progress" ON pte_user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own PTE progress" ON pte_user_progress;
CREATE POLICY "Users can update their own PTE progress" ON pte_user_progress
    FOR UPDATE USING (auth.uid() = user_id);

