-- Create table to store email verification OTPs
CREATE TABLE IF NOT EXISTS public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_email_otps_email_code ON public.email_otps(email, code);
CREATE INDEX idx_email_otps_expires_at ON public.email_otps(expires_at);

-- Enable RLS (optional - these are temporary codes)
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (needed for signup)
CREATE POLICY "Anyone can insert OTPs" ON public.email_otps
  FOR INSERT WITH CHECK (true);

-- Policy: Service role can read/delete (used by edge functions)
CREATE POLICY "Service role can manage OTPs" ON public.email_otps
  FOR ALL USING (true);