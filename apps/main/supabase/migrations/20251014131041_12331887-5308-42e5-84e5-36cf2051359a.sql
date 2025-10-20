-- Fix vocab_translations schema for system translations
-- 1. Make user_id nullable (system translations don't belong to a user)
ALTER TABLE vocab_translations ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop the FK constraint to auth.users (system translations use null user_id)
ALTER TABLE vocab_translations DROP CONSTRAINT IF EXISTS vocab_translations_user_id_fkey;

-- 3. Add is_system flag to distinguish system vs user translations
ALTER TABLE vocab_translations ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- 4. Create index for system translations
CREATE INDEX IF NOT EXISTS idx_vocab_translations_system ON vocab_translations(is_system) WHERE is_system = true;

-- 5. Update RLS policies to allow service_role to manage all translations
DROP POLICY IF EXISTS "vocab_translations_user" ON vocab_translations;
DROP POLICY IF EXISTS "vocab_translations_service" ON vocab_translations;
DROP POLICY IF EXISTS "vocab_translations_read" ON vocab_translations;

-- Service role can manage everything
CREATE POLICY "vocab_translations_service" ON vocab_translations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Users can manage their own translations
CREATE POLICY "vocab_translations_user_own" ON vocab_translations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Everyone can read system translations
CREATE POLICY "vocab_translations_read_system" ON vocab_translations
FOR SELECT
USING (is_system = true OR auth.uid() = user_id);