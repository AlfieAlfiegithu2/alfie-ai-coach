ALTER TABLE listening_tests 
ADD COLUMN IF NOT EXISTS transcript_json JSONB;
