-- Add column to store detailed correction analysis data from analyze-writing-correction function
ALTER TABLE writing_test_results 
ADD COLUMN correction_analysis JSONB;