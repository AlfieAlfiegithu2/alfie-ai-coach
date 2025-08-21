-- Add metadata column to chat_cache table for monitoring and optimization
ALTER TABLE public.chat_cache ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_cache_metadata ON public.chat_cache USING GIN(metadata);

-- Add index on complexity level for analytics
CREATE INDEX IF NOT EXISTS idx_chat_cache_complexity ON public.chat_cache ((metadata->>'complexity_level'));

COMMENT ON COLUMN public.chat_cache.metadata IS 'Stores response metadata including complexity level, token usage, and truncation status for monitoring and optimization';