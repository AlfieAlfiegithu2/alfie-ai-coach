-- Add audio_url column to vocab_cards table for TTS audio storage
ALTER TABLE public.vocab_cards 
ADD COLUMN IF NOT EXISTS audio_url text;

-- Add index for faster queries on audio_url
CREATE INDEX IF NOT EXISTS idx_vocab_cards_audio_url ON public.vocab_cards(audio_url) WHERE audio_url IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.vocab_cards.audio_url IS 'URL to TTS audio file stored in Cloudflare R2';

