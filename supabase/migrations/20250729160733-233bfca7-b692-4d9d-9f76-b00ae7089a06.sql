-- Add native_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN native_language text DEFAULT 'English';

-- Update the handle_new_user function to include native_language
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, native_language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'English'
  );
  RETURN NEW;
END;
$function$;