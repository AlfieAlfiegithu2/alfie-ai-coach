-- Create vocab_translation_queue table for background translation processing
CREATE TABLE IF NOT EXISTS vocab_translation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES vocab_cards(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  attempts INTEGER DEFAULT 0
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vocab_translation_queue_user_status ON vocab_translation_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vocab_translation_queue_status_created ON vocab_translation_queue(status, created_at);

-- Enable RLS
ALTER TABLE vocab_translation_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own translation jobs
CREATE POLICY "Users can only access their own translation jobs" ON vocab_translation_queue
  FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vocab_translation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_vocab_translation_queue_updated_at
  BEFORE UPDATE ON vocab_translation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_vocab_translation_queue_updated_at();
