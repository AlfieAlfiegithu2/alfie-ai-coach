-- EMERGENCY: Disable public access to reduce egress
-- Run this in Supabase SQL Editor to immediately stop egress

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

-- This will immediately stop all egress from these buckets
-- You'll need to update your code to use Cloudflare R2 instead
