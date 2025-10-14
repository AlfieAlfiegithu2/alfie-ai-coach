-- Add service role policy to vocab_translation_queue for background processing
-- This allows the process-translations Edge Function to access all pending jobs

CREATE POLICY IF NOT EXISTS "Service role can manage all translation jobs" 
ON vocab_translation_queue
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Also add a policy to allow reading pending jobs for processing
CREATE POLICY IF NOT EXISTS "Edge functions can read pending jobs" 
ON vocab_translation_queue
FOR SELECT 
USING (status = 'pending');

