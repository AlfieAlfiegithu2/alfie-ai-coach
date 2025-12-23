-- Add transcript_json and answer_image_url to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS transcript_json JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_image_url TEXT;

COMMENT ON COLUMN questions.transcript_json IS 'Generated timestamp data for transcript viewer';
COMMENT ON COLUMN questions.answer_image_url IS 'URL for the answer key image (e.g. map/diagram)';
