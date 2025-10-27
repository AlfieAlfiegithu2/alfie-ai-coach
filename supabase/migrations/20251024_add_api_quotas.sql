-- Create user_api_quotas table for tracking API calls
CREATE TABLE IF NOT EXISTS user_api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL,
  calls_today INTEGER DEFAULT 0,
  calls_this_hour INTEGER DEFAULT 0,
  last_call_hour INTEGER DEFAULT 0,
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per day
  UNIQUE(user_id, quota_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_api_quotas_user_id_date 
  ON user_api_quotas(user_id, quota_date);

-- Enable RLS
ALTER TABLE user_api_quotas ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own quota records
CREATE POLICY "Users can read their own quotas"
  ON user_api_quotas FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to manage all quotas
CREATE POLICY "Service role can manage all quotas"
  ON user_api_quotas FOR ALL
  USING (true)
  WITH CHECK (true)
  AS (admin);

-- Create function to increment API calls atomically
CREATE OR REPLACE FUNCTION increment_api_calls(
  p_user_id UUID,
  p_quota_date DATE
)
RETURNS void AS $$
BEGIN
  UPDATE user_api_quotas
  SET 
    calls_today = calls_today + 1,
    calls_this_hour = calls_this_hour + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id AND quota_date = p_quota_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

