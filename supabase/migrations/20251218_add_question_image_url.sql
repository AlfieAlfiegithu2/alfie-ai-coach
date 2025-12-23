ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question_image_url TEXT;

COMMENT ON COLUMN questions.question_image_url IS 'URL for an image associated with the question (e.g. map, diagram, photo)';
