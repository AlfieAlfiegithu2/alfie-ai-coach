ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS audio_urls text[],
ADD COLUMN IF NOT EXISTS audio_retention_expires_at timestamp with time zone;
