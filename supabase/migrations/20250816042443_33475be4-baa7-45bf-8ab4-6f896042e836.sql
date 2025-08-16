-- CRITICAL SECURITY FIXES MIGRATION

-- 1. Fix Admin Authentication System
-- Drop existing insecure admin_sessions table and recreate with proper security
DROP TABLE IF EXISTS public.admin_sessions CASCADE;

CREATE TABLE public.admin_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Secure RLS policies for admin_sessions (only service role access)
CREATE POLICY "Service role only access to admin sessions"
ON public.admin_sessions
FOR ALL
USING (false)
WITH CHECK (false);

-- 2. Secure Admin Users Table
-- Update admin_users RLS policies to be more restrictive
DROP POLICY IF EXISTS "Admin users can view themselves" ON public.admin_users;
DROP POLICY IF EXISTS "No direct admin user modifications" ON public.admin_users;

CREATE POLICY "No direct access to admin users"
ON public.admin_users
FOR ALL
USING (false)
WITH CHECK (false);

-- 3. Fix User Vocabulary Security
-- Ensure user_vocabulary table has proper constraints
ALTER TABLE public.user_vocabulary 
ALTER COLUMN user_id SET NOT NULL;

-- Drop and recreate more restrictive policies for user_vocabulary
DROP POLICY IF EXISTS "Users can view their own vocabulary" ON public.user_vocabulary;
DROP POLICY IF EXISTS "Users can insert their own vocabulary" ON public.user_vocabulary;
DROP POLICY IF EXISTS "Users can delete their own vocabulary" ON public.user_vocabulary;

CREATE POLICY "Users can view their own vocabulary"
ON public.user_vocabulary
FOR SELECT
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own vocabulary"
ON public.user_vocabulary
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own vocabulary"
ON public.user_vocabulary
FOR DELETE
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- 4. Secure Community Features
-- Restrict community posts to authenticated users only
DROP POLICY IF EXISTS "Community posts are viewable by everyone" ON public.community_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.community_posts;

CREATE POLICY "Authenticated users can view community posts"
ON public.community_posts
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create posts"
ON public.community_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own posts"
ON public.community_posts
FOR UPDATE
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own posts"
ON public.community_posts
FOR DELETE
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Secure community comments similarly
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.community_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.community_comments;

CREATE POLICY "Authenticated users can view comments"
ON public.community_comments
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create comments"
ON public.community_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments"
ON public.community_comments
FOR UPDATE
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own comments"
ON public.community_comments
FOR DELETE
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- 5. Secure Profiles Access
-- Restrict profile viewing to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- 6. Add Security Indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON public.admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_user_id ON public.user_vocabulary(user_id);

-- 7. Create secure session management functions
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.admin_sessions 
  WHERE expires_at < now();
END;
$function$;

-- 8. Create function to validate admin sessions
CREATE OR REPLACE FUNCTION public.validate_admin_session(session_token text)
RETURNS TABLE(admin_id uuid, email text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Clean up expired sessions first
  DELETE FROM public.admin_sessions WHERE expires_at < now();
  
  -- Update last accessed time and return admin info
  UPDATE public.admin_sessions 
  SET last_accessed = now()
  WHERE admin_sessions.session_token = validate_admin_session.session_token
    AND expires_at > now();
  
  RETURN QUERY
  SELECT au.id, au.email, au.name
  FROM public.admin_sessions ads
  JOIN public.admin_users au ON au.id = ads.admin_id
  WHERE ads.session_token = validate_admin_session.session_token
    AND ads.expires_at > now();
END;
$function$;