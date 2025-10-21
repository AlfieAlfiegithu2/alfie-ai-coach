-- Clean up massive translation queue that's causing high disk IO

-- 1. Delete all pending jobs (translation system is now manual-only)
DELETE FROM vocab_translation_queue WHERE status = 'pending';

-- 2. Delete old completed jobs (keep only recent ones for reference)
DELETE FROM vocab_translation_queue 
WHERE status = 'completed' 
AND updated_at < NOW() - INTERVAL '7 days';

-- 3. Delete failed jobs older than 3 days
DELETE FROM vocab_translation_queue 
WHERE status = 'failed' 
AND updated_at < NOW() - INTERVAL '3 days';

-- 4. Add index to improve future queue operations
CREATE INDEX IF NOT EXISTS idx_vocab_queue_status_created 
ON vocab_translation_queue(status, created_at);