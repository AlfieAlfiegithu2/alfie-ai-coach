-- Clear all cached writing analysis to force fresh analysis with new logic
DELETE FROM public.writing_analysis_cache;

-- Also clear correction analysis from writing test results to force regeneration
UPDATE public.writing_test_results SET correction_analysis = NULL WHERE correction_analysis IS NOT NULL;