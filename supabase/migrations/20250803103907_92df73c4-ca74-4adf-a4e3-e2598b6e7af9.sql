-- Create vocabulary_words table for cached translations
CREATE TABLE public.vocabulary_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  language_code TEXT NOT NULL,
  translation TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(word, language_code)
);

-- Create user_vocabulary table for user's personal vocabulary
CREATE TABLE public.user_vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_word_id UUID NOT NULL REFERENCES public.vocabulary_words(id) ON DELETE CASCADE,
  context TEXT,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, vocabulary_word_id)
);

-- Enable Row Level Security
ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vocabulary_words (readable by everyone, manageable by service role)
CREATE POLICY "Vocabulary words are viewable by everyone" 
ON public.vocabulary_words 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage vocabulary words" 
ON public.vocabulary_words 
FOR ALL 
USING (auth.role() = 'service_role');

-- RLS Policies for user_vocabulary
CREATE POLICY "Users can view their own vocabulary" 
ON public.user_vocabulary 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary" 
ON public.user_vocabulary 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary" 
ON public.user_vocabulary 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary" 
ON public.user_vocabulary 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_vocabulary_words_word_lang ON public.vocabulary_words(word, language_code);
CREATE INDEX idx_vocabulary_words_usage_count ON public.vocabulary_words(usage_count DESC);
CREATE INDEX idx_user_vocabulary_user_id ON public.user_vocabulary(user_id);
CREATE INDEX idx_user_vocabulary_word_id ON public.user_vocabulary(vocabulary_word_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_vocabulary_words_updated_at
BEFORE UPDATE ON public.vocabulary_words
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();