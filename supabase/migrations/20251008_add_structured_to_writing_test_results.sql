-- Add structured snapshot column to persist canonical writing analysis per task
ALTER TABLE public.writing_test_results
ADD COLUMN IF NOT EXISTS structured jsonb;


