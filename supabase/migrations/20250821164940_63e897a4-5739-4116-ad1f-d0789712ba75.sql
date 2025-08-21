-- Create universal cache table for Foxbot responses
CREATE TABLE public.chat_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL,
  response TEXT NOT NULL,
  task_context TEXT,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days')
);

-- Create index for fast lookups
CREATE UNIQUE INDEX idx_chat_cache_key ON public.chat_cache(cache_key);
CREATE INDEX idx_chat_cache_expires ON public.chat_cache(expires_at);

-- Create universal cache table for translations
CREATE TABLE public.translation_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  source_lang TEXT NOT NULL DEFAULT 'auto',
  target_lang TEXT NOT NULL,
  translation TEXT NOT NULL,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Create unique index for translation lookups
CREATE UNIQUE INDEX idx_translation_cache_key ON public.translation_cache(word, source_lang, target_lang);
CREATE INDEX idx_translation_cache_expires ON public.translation_cache(expires_at);
CREATE INDEX idx_translation_hit_count ON public.translation_cache(hit_count DESC);

-- Enable RLS for cache tables
ALTER TABLE public.chat_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage cache
CREATE POLICY "Service role can manage chat cache" ON public.chat_cache
FOR ALL USING (true);

CREATE POLICY "Service role can manage translation cache" ON public.translation_cache  
FOR ALL USING (true);

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Clean up expired chat cache
  DELETE FROM public.chat_cache WHERE expires_at < now();
  
  -- Clean up expired translation cache, but keep frequently used ones
  DELETE FROM public.translation_cache 
  WHERE expires_at < now() AND hit_count < 3;
  
  -- Extend expiry for frequently used translations
  UPDATE public.translation_cache 
  SET expires_at = now() + INTERVAL '30 days'
  WHERE hit_count >= 10 AND expires_at < now() + INTERVAL '7 days';
END;
$$;

-- Create trigger for updating timestamps
CREATE TRIGGER update_chat_cache_updated_at
BEFORE UPDATE ON public.chat_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_translation_cache_updated_at  
BEFORE UPDATE ON public.translation_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();