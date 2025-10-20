-- Add part_number column to reading and listening tables
ALTER TABLE public.reading_passages ADD COLUMN part_number INTEGER DEFAULT 1;
ALTER TABLE public.reading_questions ADD COLUMN part_number INTEGER DEFAULT 1;
ALTER TABLE public.listening_sections ADD COLUMN part_number INTEGER DEFAULT 1;
ALTER TABLE public.listening_questions ADD COLUMN part_number INTEGER DEFAULT 1;

-- Add indexes for better performance
CREATE INDEX idx_reading_passages_part ON public.reading_passages(cambridge_book, test_number, section_number, part_number);
CREATE INDEX idx_reading_questions_part ON public.reading_questions(passage_id, part_number);
CREATE INDEX idx_listening_sections_part ON public.listening_sections(cambridge_book, test_number, section_number, part_number);
CREATE INDEX idx_listening_questions_part ON public.listening_questions(section_id, part_number);

-- Update existing data to set part_number = 1 where null
UPDATE public.reading_passages SET part_number = 1 WHERE part_number IS NULL;
UPDATE public.reading_questions SET part_number = 1 WHERE part_number IS NULL;
UPDATE public.listening_sections SET part_number = 1 WHERE part_number IS NULL;
UPDATE public.listening_questions SET part_number = 1 WHERE part_number IS NULL;