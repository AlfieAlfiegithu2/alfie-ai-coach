-- Create audio analytics tracking table
CREATE TABLE IF NOT EXISTS public.audio_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT NOT NULL,
  voice TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'play', 'generate', 'cache_hit'
  file_size_bytes BIGINT,
  storage_path TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_audio_analytics_created_at ON public.audio_analytics(created_at DESC);
CREATE INDEX idx_audio_analytics_question_id ON public.audio_analytics(question_id);
CREATE INDEX idx_audio_analytics_action_type ON public.audio_analytics(action_type);

-- Enable RLS
ALTER TABLE public.audio_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage analytics
CREATE POLICY "Service role can manage audio analytics" ON public.audio_analytics
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Admins can view analytics
CREATE POLICY "Admins can view audio analytics" ON public.audio_analytics
  FOR SELECT USING (is_admin());

-- Add storage_path column to audio_cache for migration
ALTER TABLE public.audio_cache ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.audio_cache ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE public.audio_cache ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;

-- Create function to get storage stats
CREATE OR REPLACE FUNCTION public.get_storage_stats()
RETURNS TABLE (
  bucket_id TEXT,
  file_count BIGINT,
  total_bytes BIGINT,
  avg_bytes NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.bucket_id::TEXT,
    COUNT(*)::BIGINT as file_count,
    SUM((o.metadata->>'size')::BIGINT)::BIGINT as total_bytes,
    AVG((o.metadata->>'size')::BIGINT)::NUMERIC as avg_bytes
  FROM storage.objects o
  GROUP BY o.bucket_id
  ORDER BY total_bytes DESC;
END;
$$;

-- Create function to get audio analytics summary
CREATE OR REPLACE FUNCTION public.get_audio_analytics_summary(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_plays BIGINT,
  total_generations BIGINT,
  cache_hits BIGINT,
  unique_questions BIGINT,
  total_egress_bytes BIGINT,
  avg_file_size NUMERIC,
  cache_hit_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE action_type = 'play')::BIGINT as total_plays,
    COUNT(*) FILTER (WHERE action_type = 'generate')::BIGINT as total_generations,
    COUNT(*) FILTER (WHERE action_type = 'cache_hit')::BIGINT as cache_hits,
    COUNT(DISTINCT question_id)::BIGINT as unique_questions,
    SUM(COALESCE(file_size_bytes, 0))::BIGINT as total_egress_bytes,
    AVG(COALESCE(file_size_bytes, 0))::NUMERIC as avg_file_size,
    CASE 
      WHEN COUNT(*) FILTER (WHERE action_type IN ('play', 'cache_hit')) > 0 
      THEN (COUNT(*) FILTER (WHERE action_type = 'cache_hit')::NUMERIC / 
            COUNT(*) FILTER (WHERE action_type IN ('play', 'cache_hit'))::NUMERIC * 100)
      ELSE 0
    END as cache_hit_rate
  FROM audio_analytics
  WHERE created_at > now() - (days_back || ' days')::INTERVAL;
END;
$$;