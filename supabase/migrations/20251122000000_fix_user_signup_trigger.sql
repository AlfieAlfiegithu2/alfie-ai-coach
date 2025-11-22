-- Fix user signup trigger issue
-- The handle_new_user function needs to bypass RLS when creating profiles

-- Add policy to allow service role to manage profiles (for trigger operations)
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles"
ON public.profiles
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Ensure the handle_new_user function is properly configured
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (id, full_name, role, subscription_status, native_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user',
    'free',
    COALESCE(NEW.raw_user_meta_data->>'native_language', 'en')
  );

  -- Log successful profile creation
  RAISE LOG 'Created profile for user: %', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$function$;

-- Ensure the trigger exists and is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
