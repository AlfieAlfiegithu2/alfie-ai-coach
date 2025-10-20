-- Create user_analytics table for tracking user interactions
CREATE TABLE public.user_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anon_user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  question_id TEXT,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for performance on frequent queries
CREATE INDEX idx_user_analytics_action_type ON public.user_analytics(action_type);
CREATE INDEX idx_user_analytics_timestamp ON public.user_analytics(timestamp);
CREATE INDEX idx_user_analytics_anon_user_id ON public.user_analytics(anon_user_id);

-- Enable Row Level Security
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Policy for admin-only read access
CREATE POLICY "Admin can view analytics" 
ON public.user_analytics 
FOR SELECT 
USING (false); -- Will be controlled by service role key in admin functions

-- Policy for inserting analytics (open for logging)
CREATE POLICY "Allow analytics logging" 
ON public.user_analytics 
FOR INSERT 
WITH CHECK (true);

-- No update/delete policies needed for analytics data