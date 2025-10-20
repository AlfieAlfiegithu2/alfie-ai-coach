-- Phase 1: Database Schema Enhancement
-- Add audio retention and detailed analytics fields to test_results table
ALTER TABLE test_results 
ADD COLUMN IF NOT EXISTS audio_urls text[],
ADD COLUMN IF NOT EXISTS audio_retention_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS detailed_feedback jsonb,
ADD COLUMN IF NOT EXISTS question_analysis jsonb,
ADD COLUMN IF NOT EXISTS performance_metrics jsonb,
ADD COLUMN IF NOT EXISTS skill_breakdown jsonb;

-- Create audio cleanup function for 30-day retention
CREATE OR REPLACE FUNCTION cleanup_expired_audio()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_record RECORD;
    audio_url text;
BEGIN
    -- Find expired audio records
    FOR expired_record IN 
        SELECT id, audio_urls 
        FROM test_results 
        WHERE audio_retention_expires_at < NOW() 
        AND audio_urls IS NOT NULL 
        AND array_length(audio_urls, 1) > 0
    LOOP
        -- Delete each audio file from storage
        IF expired_record.audio_urls IS NOT NULL THEN
            FOREACH audio_url IN ARRAY expired_record.audio_urls
            LOOP
                -- Extract filename from URL for deletion
                PERFORM storage.delete('audio-files', split_part(audio_url, '/', -1));
            END LOOP;
        END IF;
        
        -- Clear audio URLs and expiration date
        UPDATE test_results 
        SET audio_urls = NULL, 
            audio_retention_expires_at = NULL 
        WHERE id = expired_record.id;
        
        RAISE LOG 'Cleaned up audio for test result: %', expired_record.id;
    END LOOP;
END;
$$;

-- Create speaking_test_results table for detailed speaking analysis
CREATE TABLE IF NOT EXISTS speaking_test_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    test_result_id uuid REFERENCES test_results(id) ON DELETE CASCADE,
    part_number integer NOT NULL,
    question_text text NOT NULL,
    audio_url text,
    transcription text,
    band_scores jsonb, -- fluency, pronunciation, grammar, vocabulary
    detailed_feedback text,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now(),
    audio_expires_at timestamp with time zone DEFAULT (now() + interval '30 days')
);

-- Enable RLS on speaking_test_results
ALTER TABLE speaking_test_results ENABLE ROW LEVEL SECURITY;

-- Create policies for speaking_test_results
CREATE POLICY "Users can view their own speaking results" 
ON speaking_test_results FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own speaking results" 
ON speaking_test_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own speaking results" 
ON speaking_test_results FOR UPDATE 
USING (auth.uid() = user_id);

-- Create writing_test_results table for detailed writing analysis
CREATE TABLE IF NOT EXISTS writing_test_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    test_result_id uuid REFERENCES test_results(id) ON DELETE CASCADE,
    task_number integer NOT NULL,
    prompt_text text NOT NULL,
    user_response text NOT NULL,
    word_count integer NOT NULL,
    band_scores jsonb, -- task achievement, coherence, lexical resource, grammar
    detailed_feedback text,
    improvement_suggestions text[],
    time_taken_seconds integer,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on writing_test_results
ALTER TABLE writing_test_results ENABLE ROW LEVEL SECURITY;

-- Create policies for writing_test_results
CREATE POLICY "Users can view their own writing results" 
ON writing_test_results FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own writing results" 
ON writing_test_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create listening_test_results table for detailed listening analysis
CREATE TABLE IF NOT EXISTS listening_test_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    test_result_id uuid REFERENCES test_results(id) ON DELETE CASCADE,
    section_number integer NOT NULL,
    section_title text NOT NULL,
    audio_url text,
    questions_data jsonb NOT NULL, -- question details, user answers, correct answers
    section_score integer NOT NULL,
    section_total integer NOT NULL,
    detailed_feedback text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on listening_test_results
ALTER TABLE listening_test_results ENABLE ROW LEVEL SECURITY;

-- Create policies for listening_test_results
CREATE POLICY "Users can view their own listening results" 
ON listening_test_results FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listening results" 
ON listening_test_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create reading_test_results table for detailed reading analysis (if not exists)
CREATE TABLE IF NOT EXISTS reading_test_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    test_result_id uuid REFERENCES test_results(id) ON DELETE CASCADE,
    passage_title text NOT NULL,
    passage_text text NOT NULL,
    questions_data jsonb NOT NULL, -- question details, user answers, correct answers
    reading_time_seconds integer,
    comprehension_score numeric(3,2),
    question_type_performance jsonb, -- performance by question type
    detailed_feedback text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on reading_test_results
ALTER TABLE reading_test_results ENABLE ROW LEVEL SECURITY;

-- Create policies for reading_test_results
CREATE POLICY "Users can view their own reading results" 
ON reading_test_results FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading results" 
ON reading_test_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_speaking_results_user_id ON speaking_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_results_user_id ON writing_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_results_user_id ON listening_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_results_user_id ON reading_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_audio_expiry ON test_results(audio_retention_expires_at) WHERE audio_retention_expires_at IS NOT NULL;