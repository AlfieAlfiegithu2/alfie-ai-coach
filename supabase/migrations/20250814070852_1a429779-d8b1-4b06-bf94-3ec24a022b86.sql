-- Remove old vocabulary tables if they exist
DROP TABLE IF EXISTS public.vocabulary_words CASCADE;
DROP TABLE IF EXISTS public.user_vocabulary CASCADE;

-- Create the new user_vocabulary table
CREATE TABLE IF NOT EXISTS public.user_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  part_of_speech TEXT, -- e.g., 'noun', 'verb', 'adjective'
  translations TEXT[], -- An array of possible translations
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, word) -- A user can only save the same word once
);

-- Enable RLS
ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert their own vocabulary" 
ON public.user_vocabulary 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own vocabulary" 
ON public.user_vocabulary 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary" 
ON public.user_vocabulary 
FOR DELETE 
USING (auth.uid() = user_id);