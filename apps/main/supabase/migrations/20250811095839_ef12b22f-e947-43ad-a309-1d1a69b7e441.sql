-- Create storage bucket for listening audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listening-audio', 'listening-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for listening audio bucket
CREATE POLICY "Admins can upload listening audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'listening-audio' AND is_admin());

CREATE POLICY "Admins can delete listening audio" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'listening-audio' AND is_admin());

CREATE POLICY "Listening audio files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'listening-audio');