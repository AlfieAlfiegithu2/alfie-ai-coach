-- ================================================
-- Auth OTP Tables Migration
-- Run this to ensure all OTP tables exist with correct structure
-- ================================================

-- 1. Create signup_otps table for email verification during signup
CREATE TABLE IF NOT EXISTS public.signup_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

-- Add unique constraint if not exists (handles duplicate emails)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signup_otps_email_key'
  ) THEN
    ALTER TABLE public.signup_otps ADD CONSTRAINT signup_otps_email_key UNIQUE (email);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_signup_otps_email ON public.signup_otps(email);
CREATE INDEX IF NOT EXISTS idx_signup_otps_expires_at ON public.signup_otps(expires_at);

-- Enable RLS
ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Service role only" ON public.signup_otps;
DROP POLICY IF EXISTS "service_role_signup_otps" ON public.signup_otps;

-- Only allow service role to access this table
CREATE POLICY "service_role_signup_otps" ON public.signup_otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 2. Create password_reset_otps table for password reset verification
-- ================================================
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

-- Add unique constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_otps_email_key'
  ) THEN
    ALTER TABLE public.password_reset_otps ADD CONSTRAINT password_reset_otps_email_key UNIQUE (email);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON public.password_reset_otps(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Service role only" ON public.password_reset_otps;
DROP POLICY IF EXISTS "service_role_password_reset_otps" ON public.password_reset_otps;

-- Only allow service role to access this table
CREATE POLICY "service_role_password_reset_otps" ON public.password_reset_otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 3. Clean up expired OTPs (optional: run periodically)
-- ================================================
-- Delete expired signup OTPs
DELETE FROM public.signup_otps WHERE expires_at < NOW();

-- Delete expired password reset OTPs
DELETE FROM public.password_reset_otps WHERE expires_at < NOW();

-- ================================================
-- Comments
-- ================================================
COMMENT ON TABLE public.signup_otps IS 'Stores OTP codes for email verification during signup';
COMMENT ON TABLE public.password_reset_otps IS 'Stores OTP codes for password reset verification';

-- ================================================
-- Grant permissions to service_role
-- ================================================
GRANT ALL ON public.signup_otps TO service_role;
GRANT ALL ON public.password_reset_otps TO service_role;

