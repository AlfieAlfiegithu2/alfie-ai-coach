-- Add Cambridge book and test number fields to content tables
ALTER TABLE public.reading_passages 
ADD COLUMN cambridge_book TEXT,
ADD COLUMN test_number INTEGER;

ALTER TABLE public.listening_sections 
ADD COLUMN cambridge_book TEXT,
ADD COLUMN test_number INTEGER;

ALTER TABLE public.writing_prompts 
ADD COLUMN cambridge_book TEXT,
ADD COLUMN test_number INTEGER;

ALTER TABLE public.speaking_prompts 
ADD COLUMN cambridge_book TEXT,
ADD COLUMN test_number INTEGER;