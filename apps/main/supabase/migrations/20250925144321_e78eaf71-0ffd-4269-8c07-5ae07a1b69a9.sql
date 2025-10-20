-- Create the missing vocabulary_words table
CREATE TABLE public.vocabulary_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  language_code TEXT NOT NULL,
  translation TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Create unique constraint for word+language combination
  UNIQUE(word, language_code)
);

-- Enable RLS
ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;

-- Create policies for vocabulary_words
CREATE POLICY "Vocabulary words are viewable by everyone" 
ON public.vocabulary_words 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can manage vocabulary words" 
ON public.vocabulary_words 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Create index for better performance
CREATE INDEX idx_vocabulary_words_language ON public.vocabulary_words(language_code);
CREATE INDEX idx_vocabulary_words_usage ON public.vocabulary_words(usage_count DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vocabulary_words_updated_at
BEFORE UPDATE ON public.vocabulary_words
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update user_vocabulary table to reference vocabulary_words properly
ALTER TABLE public.user_vocabulary 
ADD COLUMN vocabulary_word_id UUID REFERENCES public.vocabulary_words(id);

-- Create index for the foreign key
CREATE INDEX idx_user_vocabulary_word_id ON public.user_vocabulary(vocabulary_word_id);