-- Fix the test_results table by adding the missing created_at column
ALTER TABLE public.test_results 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update the column to be NOT NULL with a default
UPDATE public.test_results 
SET created_at = completed_at 
WHERE created_at IS NULL;

-- Make created_at NOT NULL
ALTER TABLE public.test_results 
ALTER COLUMN created_at SET NOT NULL;