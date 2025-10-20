-- Create audio cache table for efficient Speaking voice generation
CREATE TABLE IF NOT EXISTS public.audio_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id TEXT NOT NULL,
  voice TEXT NOT NULL DEFAULT 'alloy',
  audio_url TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_audio_cache_question_voice ON public.audio_cache(question_id, voice);
CREATE INDEX IF NOT EXISTS idx_audio_cache_created_at ON public.audio_cache(created_at);

-- Enable RLS
ALTER TABLE public.audio_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (admin functions only)
CREATE POLICY "Service role can manage audio cache" 
ON public.audio_cache 
FOR ALL 
TO service_role 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_audio_cache_updated_at
BEFORE UPDATE ON public.audio_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();