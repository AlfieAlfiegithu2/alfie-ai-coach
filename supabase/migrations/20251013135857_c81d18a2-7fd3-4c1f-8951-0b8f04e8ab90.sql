-- Add system field to vocab_translations to distinguish system-wide translations
ALTER TABLE vocab_translations ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Drop existing policies
DROP POLICY IF EXISTS "vocab_translations_user" ON vocab_translations;

-- Allow users to manage their own translations
CREATE POLICY "Users can manage own translations"
ON vocab_translations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage system translations
CREATE POLICY "Service role can manage system translations"
ON vocab_translations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow everyone to read system translations
CREATE POLICY "Everyone can read system translations"
ON vocab_translations
FOR SELECT
USING (is_system = true);