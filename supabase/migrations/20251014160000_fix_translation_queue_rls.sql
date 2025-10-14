-- Add service role policy to vocab_translation_queue for background processing
-- This allows the process-translations Edge Function to access all pending jobs

-- Drop policies if they exist first, then recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Service role can manage all translation jobs" ON vocab_translation_queue;
  DROP POLICY IF EXISTS "Edge functions can read pending jobs" ON vocab_translation_queue;
END $$;

CREATE POLICY "Service role can manage all translation jobs" 
ON vocab_translation_queue
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Edge functions can read pending jobs" 
ON vocab_translation_queue
FOR SELECT 
USING (status = 'pending');

