-- Create trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user');
  RETURN NEW;
END;
$$;

-- Create trigger to run after user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- For existing users, create profiles and set the first user as admin
DO $$
DECLARE
    user_record RECORD;
    first_user_id UUID;
BEGIN
    -- Get the first (earliest) user to make them admin
    SELECT id INTO first_user_id 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;

    -- Create profiles for all existing users
    FOR user_record IN 
        SELECT id, email, raw_user_meta_data 
        FROM auth.users 
    LOOP
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (
            user_record.id, 
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
            CASE 
                WHEN user_record.id = first_user_id THEN 'admin'
                ELSE 'user'
            END
        )
        ON CONFLICT (id) DO UPDATE SET
            role = CASE 
                WHEN user_record.id = first_user_id THEN 'admin'
                ELSE profiles.role
            END;
    END LOOP;
END $$;