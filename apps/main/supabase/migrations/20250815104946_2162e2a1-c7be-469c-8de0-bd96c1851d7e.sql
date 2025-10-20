-- Create bookmarks table for saving specific questions for review
CREATE TABLE public.question_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  question_id text NOT NULL,
  question_text text NOT NULL,
  question_type text,
  user_answer text,
  correct_answer text NOT NULL,
  explanation text,
  options jsonb,
  passage_title text,
  passage_text text,
  test_result_id uuid,
  notes text, -- User can add personal notes
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id, test_result_id) -- Prevent duplicate bookmarks for same question from same test
);

-- Enable Row Level Security
ALTER TABLE public.question_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own bookmarks" 
ON public.question_bookmarks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks" 
ON public.question_bookmarks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks" 
ON public.question_bookmarks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" 
ON public.question_bookmarks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_question_bookmarks_updated_at
BEFORE UPDATE ON public.question_bookmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();