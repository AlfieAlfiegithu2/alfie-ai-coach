-- Create signup_otps table for storing email verification codes
CREATE TABLE IF NOT EXISTS public.signup_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signup_otps_email ON public.signup_otps(email);
CREATE INDEX IF NOT EXISTS idx_signup_otps_expires_at ON public.signup_otps(expires_at);

-- Enable RLS
ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access this table (edge functions use service role)
CREATE POLICY "Service role only" ON public.signup_otps
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE public.signup_otps IS 'Stores OTP codes for email verification during signup';

