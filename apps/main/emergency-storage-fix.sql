-- EMERGENCY: Stop Egress Bleeding
-- Make all public buckets private to prevent bot/scraper downloads
-- This will eliminate most egress costs

-- Remove public access from audio-files bucket
UPDATE storage.buckets 
SET public = false 
WHERE id = 'audio-files';

-- Remove public access from listening-audio bucket  
UPDATE storage.buckets 
SET public = false 
WHERE id = 'listening-audio';

-- Remove public access from avatars bucket
UPDATE storage.buckets 
SET public = false 
WHERE id = 'avatars';

-- Verify the changes
SELECT id, name, public FROM storage.buckets WHERE id IN ('audio-files', 'listening-audio', 'avatars');
