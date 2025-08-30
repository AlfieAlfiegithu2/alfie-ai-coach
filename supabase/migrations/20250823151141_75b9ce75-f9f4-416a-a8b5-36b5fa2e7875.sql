-- Remove correction_analysis column from writing_test_results table since we're moving to on-demand generation
ALTER TABLE public.writing_test_results DROP COLUMN IF EXISTS correction_analysis;