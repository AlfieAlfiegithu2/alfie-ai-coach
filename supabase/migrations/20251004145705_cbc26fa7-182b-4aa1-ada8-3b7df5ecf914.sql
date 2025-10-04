-- Add purpose column to email_otps table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_otps' 
    AND column_name = 'purpose'
  ) THEN
    ALTER TABLE public.email_otps 
    ADD COLUMN purpose TEXT DEFAULT 'email_verification';
  END IF;
END $$;