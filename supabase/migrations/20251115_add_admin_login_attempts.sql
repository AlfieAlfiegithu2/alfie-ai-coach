-- Create admin_login_attempts table to track failed login attempts
-- This enables blocking after 5 failed attempts and automatic unblocking

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address inet NOT NULL,
  email text,
  failed_attempts integer NOT NULL DEFAULT 1,
  blocked_until timestamp with time zone,
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups by IP address
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip ON public.admin_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_blocked ON public.admin_login_attempts(blocked_until) WHERE blocked_until IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no client access)
CREATE POLICY "Service role only access to admin login attempts"
ON public.admin_login_attempts
FOR ALL
USING (false)
WITH CHECK (false);

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION public.is_ip_blocked(check_ip inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  blocked_until_time timestamp with time zone;
BEGIN
  -- Check if IP is blocked and block period hasn't expired
  SELECT blocked_until INTO blocked_until_time
  FROM public.admin_login_attempts
  WHERE ip_address = check_ip
    AND blocked_until IS NOT NULL
    AND blocked_until > now();
  
  -- If block period expired, clear the block
  IF blocked_until_time IS NOT NULL AND blocked_until_time <= now() THEN
    UPDATE public.admin_login_attempts
    SET blocked_until = NULL,
        failed_attempts = 0,
        updated_at = now()
    WHERE ip_address = check_ip;
    RETURN false;
  END IF;
  
  -- Return true if still blocked
  RETURN blocked_until_time IS NOT NULL;
END;
$$;

-- Function to record a failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(check_ip inet, check_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_record public.admin_login_attempts%ROWTYPE;
  attempts_count integer;
  block_duration interval := '30 minutes'; -- Block for 30 minutes after 5 failures
  max_attempts integer := 5;
BEGIN
  -- Get or create attempt record
  INSERT INTO public.admin_login_attempts (ip_address, email, failed_attempts, last_attempt_at)
  VALUES (check_ip, check_email, 1, now())
  ON CONFLICT (ip_address) DO UPDATE
  SET 
    failed_attempts = admin_login_attempts.failed_attempts + 1,
    last_attempt_at = now(),
    email = COALESCE(check_email, admin_login_attempts.email),
    updated_at = now()
  RETURNING * INTO attempt_record;
  
  -- Get current attempt count
  SELECT failed_attempts INTO attempts_count
  FROM public.admin_login_attempts
  WHERE ip_address = check_ip;
  
  -- If reached max attempts, block the IP
  IF attempts_count >= max_attempts THEN
    UPDATE public.admin_login_attempts
    SET blocked_until = now() + block_duration,
        updated_at = now()
    WHERE ip_address = check_ip;
    
    RETURN jsonb_build_object(
      'blocked', true,
      'attempts', attempts_count,
      'blocked_until', (now() + block_duration)::text,
      'message', format('Too many failed attempts. Blocked until %s', (now() + block_duration)::text)
    );
  END IF;
  
  -- Return remaining attempts
  RETURN jsonb_build_object(
    'blocked', false,
    'attempts', attempts_count,
    'remaining', max_attempts - attempts_count,
    'message', format('%s attempts remaining', max_attempts - attempts_count)
  );
END;
$$;

-- Function to clear failed attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(check_ip inet)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.admin_login_attempts
  SET failed_attempts = 0,
      blocked_until = NULL,
      updated_at = now()
  WHERE ip_address = check_ip;
END;
$$;

-- Add unique constraint on IP address to prevent duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_login_attempts_ip_unique'
  ) THEN
    ALTER TABLE public.admin_login_attempts
    ADD CONSTRAINT admin_login_attempts_ip_unique UNIQUE (ip_address);
  END IF;
END $$;

