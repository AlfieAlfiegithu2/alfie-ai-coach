-- ============================================
-- AUTOMATIC BLOG GENERATION CRON JOB
-- Generates native content in 30 languages daily
-- ============================================

-- Create schedule settings table if not exists
CREATE TABLE IF NOT EXISTS blog_auto_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  posts_per_day INTEGER DEFAULT 3,
  subjects TEXT[] DEFAULT ARRAY['IELTS', 'TOEIC', 'TOEFL', 'PTE', 'Business English', 'NCLEX'],
  auto_publish BOOLEAN DEFAULT true,
  posts_generated_today INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  cron_expression TEXT DEFAULT '0 */8 * * *', -- Every 8 hours
  languages TEXT[] DEFAULT ARRAY['en', 'zh', 'es', 'ar', 'pt', 'vi', 'ko', 'ja', 'fr', 'de'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if empty
INSERT INTO blog_auto_schedule (enabled, posts_per_day, auto_publish)
SELECT true, 3, true
WHERE NOT EXISTS (SELECT 1 FROM blog_auto_schedule LIMIT 1);

-- Create blog generation log table for tracking
CREATE TABLE IF NOT EXISTS blog_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  subject TEXT NOT NULL,
  source TEXT DEFAULT 'auto',
  post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
  status TEXT NOT NULL, -- 'success', 'failed', 'skipped'
  languages_generated INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_gen_log_created ON blog_generation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_gen_log_status ON blog_generation_log(status);

-- ============================================
-- CRON JOB: Generate blog posts automatically
-- Runs every 8 hours (3x per day)
-- ============================================

-- Enable pg_cron extension (if not already enabled)
-- Note: This needs to be run by Supabase support or via dashboard
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the automatic blog generation
-- This calls the blog-keyword-generator edge function
SELECT cron.schedule(
  'auto-generate-blog-posts',           -- Job name
  '0 */8 * * *',                         -- Every 8 hours (00:00, 08:00, 16:00 UTC)
  $$
  SELECT
    net.http_post(
      url := 'https://cuumxmfzhwljylbdlflj.supabase.co/functions/v1/blog-keyword-generator',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
      ),
      body := jsonb_build_object(
        'action', 'generate_daily',
        'languages', ARRAY['en', 'zh', 'es', 'ar', 'pt', 'vi', 'ko', 'ja', 'fr', 'de']
      )
    );
  $$
);

-- ============================================
-- Helper function to update schedule counter
-- ============================================
CREATE OR REPLACE FUNCTION reset_daily_blog_counter()
RETURNS void AS $$
BEGIN
  UPDATE blog_auto_schedule
  SET posts_generated_today = 0,
      updated_at = NOW()
  WHERE DATE(last_run_at) < CURRENT_DATE OR last_run_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily counter reset at midnight UTC
SELECT cron.schedule(
  'reset-blog-counter-daily',
  '0 0 * * *',  -- Every day at midnight UTC
  $$SELECT reset_daily_blog_counter();$$
);

-- Grant necessary permissions
GRANT ALL ON blog_auto_schedule TO authenticated;
GRANT ALL ON blog_auto_schedule TO service_role;
GRANT ALL ON blog_generation_log TO authenticated;
GRANT ALL ON blog_generation_log TO service_role;

