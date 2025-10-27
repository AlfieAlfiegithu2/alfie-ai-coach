-- Migration: Initialize user_skill_progress when users are created
-- This fixes 406 errors when querying user_skill_progress for users without initial data

-- Create or replace the function to initialize user skill progress
CREATE OR REPLACE FUNCTION public.initialize_user_skill_progress()
RETURNS TRIGGER AS $$
DECLARE
  skill RECORD;
BEGIN
  -- For each skill, create a user_skill_progress record with level 1
  FOR skill IN 
    SELECT DISTINCT skill_slug FROM public.skill_tests
  LOOP
    INSERT INTO public.user_skill_progress (user_id, skill_slug, max_unlocked_level)
    VALUES (NEW.id, skill.skill_slug, 1)
    ON CONFLICT (user_id, skill_slug) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS init_user_skill_progress_trigger ON auth.users;

-- Create trigger to initialize skill progress for new users
CREATE TRIGGER init_user_skill_progress_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_skill_progress();

-- For existing users without skill progress, initialize them
INSERT INTO public.user_skill_progress (user_id, skill_slug, max_unlocked_level)
SELECT DISTINCT 
  au.id,
  st.skill_slug,
  1
FROM auth.users au
CROSS JOIN (SELECT DISTINCT skill_slug FROM public.skill_tests) st
ON CONFLICT (user_id, skill_slug) DO NOTHING;
