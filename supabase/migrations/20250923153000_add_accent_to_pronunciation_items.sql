-- Add accent column to pronunciation_items to allow American/British selection
ALTER TABLE public.pronunciation_items
ADD COLUMN IF NOT EXISTS accent text CHECK (accent IN ('american','british')) DEFAULT 'american';

-- Backfill existing rows to 'american' where null
UPDATE public.pronunciation_items SET accent = 'american' WHERE accent IS NULL;

