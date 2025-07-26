-- Add cambridge_book and section_number columns to reading_passages
ALTER TABLE public.reading_passages 
ADD COLUMN section_number INTEGER DEFAULT 1,
ADD COLUMN book_number INTEGER DEFAULT 1;

-- Add cambridge_book and section_number columns to reading_questions 
ALTER TABLE public.reading_questions
ADD COLUMN cambridge_book TEXT,
ADD COLUMN section_number INTEGER;

-- Create an index for efficient querying by book and section
CREATE INDEX idx_reading_passages_book_section ON public.reading_passages(cambridge_book, section_number);
CREATE INDEX idx_reading_questions_book_section ON public.reading_questions(cambridge_book, section_number);

-- Update existing data to have default values
UPDATE public.reading_passages 
SET book_number = 1, section_number = 1 
WHERE book_number IS NULL OR section_number IS NULL;