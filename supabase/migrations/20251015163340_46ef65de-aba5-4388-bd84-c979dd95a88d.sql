-- Add native_language column to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS native_language TEXT DEFAULT 'en';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_native_language 
ON user_preferences(native_language);