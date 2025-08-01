-- Add missing audio_url column to speaking_prompts table
ALTER TABLE public.speaking_prompts 
ADD COLUMN IF NOT EXISTS audio_url text;

-- Create admin profile for current user if not exists
INSERT INTO public.profiles (id, full_name, role)
SELECT auth.uid(), 'Admin User', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid()
);