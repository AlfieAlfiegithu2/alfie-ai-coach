-- Migration: Add admin security tables and register admin user
-- Created: 2025-12-25

-- Create admin_login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email_created 
ON public.admin_login_attempts (email, created_at DESC);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_created 
ON public.admin_login_attempts (created_at);

-- Enable RLS on admin_login_attempts
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access login attempts
CREATE POLICY "Service role can manage login attempts" ON public.admin_login_attempts
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Ensure admin_audit_log table exists with proper structure
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created 
ON public.admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action 
ON public.admin_audit_log (action);

-- Enable RLS on admin_audit_log if not already enabled
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Update audit log policies
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Only admins can view audit logs" ON public.admin_audit_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit logs" ON public.admin_audit_log
FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

-- Function to clean up old login attempts (run daily via cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.admin_login_attempts 
  WHERE created_at < now() - interval '7 days';
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO service_role;

-- Ensure admin_users table exists
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only service role can access admin_users
DROP POLICY IF EXISTS "Service role can manage admin users" ON public.admin_users;
CREATE POLICY "Service role can manage admin users" ON public.admin_users
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Ensure admin_sessions table exists
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token 
ON public.admin_sessions (session_token);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires 
ON public.admin_sessions (expires_at);

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role can access admin_sessions
DROP POLICY IF EXISTS "Service role can manage admin sessions" ON public.admin_sessions;
CREATE POLICY "Service role can manage admin sessions" ON public.admin_sessions
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Create or replace the validate_admin_session function
CREATE OR REPLACE FUNCTION public.validate_admin_session(session_token TEXT)
RETURNS TABLE (admin_id UUID, email TEXT, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id AS admin_id,
    au.email,
    au.name
  FROM public.admin_sessions AS sess
  JOIN public.admin_users AS au ON sess.admin_id = au.id
  WHERE sess.session_token = validate_admin_session.session_token
    AND sess.expires_at > now();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_admin_session(TEXT) TO anon, authenticated, service_role;

-- Function to cleanup expired admin sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.admin_sessions WHERE expires_at < now();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_expired_admin_sessions() TO service_role;
