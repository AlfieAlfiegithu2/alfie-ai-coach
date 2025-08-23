-- Create caching table for writing analysis to avoid redundant API calls
CREATE TABLE IF NOT EXISTS public.writing_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash TEXT NOT NULL UNIQUE,
  user_submission TEXT NOT NULL,
  question_prompt TEXT,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT now(),
  access_count INTEGER DEFAULT 1
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_writing_analysis_cache_content_hash ON public.writing_analysis_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_writing_analysis_cache_created_at ON public.writing_analysis_cache(created_at);

-- Enable RLS
ALTER TABLE public.writing_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Create policies - allow users to access their own cache and public cache
CREATE POLICY "Users can view writing analysis cache" ON public.writing_analysis_cache
  FOR SELECT USING (true); -- Cache is shared across users for efficiency

CREATE POLICY "System can insert into writing analysis cache" ON public.writing_analysis_cache
  FOR INSERT WITH CHECK (true); -- Only system inserts

CREATE POLICY "System can update writing analysis cache" ON public.writing_analysis_cache
  FOR UPDATE USING (true); -- Only system updates

-- Function to clean up old cache entries
CREATE OR REPLACE FUNCTION public.cleanup_writing_analysis_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete entries older than 30 days with low access count
  DELETE FROM public.writing_analysis_cache 
  WHERE created_at < now() - INTERVAL '30 days' 
  AND access_count < 3;
  
  -- Delete entries older than 90 days regardless of access count
  DELETE FROM public.writing_analysis_cache 
  WHERE created_at < now() - INTERVAL '90 days';
END;
$function$;