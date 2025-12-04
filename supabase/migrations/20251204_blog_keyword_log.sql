-- Table to track which achievable keywords have been used for blog posts
CREATE TABLE IF NOT EXISTS blog_keyword_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  subject TEXT NOT NULL,
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_blog_keyword_log_keyword ON blog_keyword_log(keyword);
CREATE INDEX IF NOT EXISTS idx_blog_keyword_log_subject ON blog_keyword_log(subject);

-- RLS policies
ALTER TABLE blog_keyword_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to keyword log"
  ON blog_keyword_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view keyword log"
  ON blog_keyword_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment
COMMENT ON TABLE blog_keyword_log IS 'Tracks which SEO keywords have been used for blog post generation';

