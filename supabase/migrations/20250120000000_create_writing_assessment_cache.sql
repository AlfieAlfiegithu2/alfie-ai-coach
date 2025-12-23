-- Create cache table for IELTS writing assessments
-- This table stores AI assessment results to avoid redundant API calls
CREATE TABLE IF NOT EXISTS public.writing_assessment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  cached_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on cache_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_writing_assessment_cache_key ON public.writing_assessment_cache(cache_key);

-- Create index on created_at for cache cleanup
CREATE INDEX IF NOT EXISTS idx_writing_assessment_cache_created_at ON public.writing_assessment_cache(created_at);

-- Enable RLS
ALTER TABLE public.writing_assessment_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read/write (for edge functions)
CREATE POLICY "Service role can manage cache" ON public.writing_assessment_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE public.writing_assessment_cache IS 'Cache for IELTS writing assessment results to reduce API costs and ensure consistency';

