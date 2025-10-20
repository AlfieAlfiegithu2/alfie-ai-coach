-- Create a function to set admin role that bypasses RLS
CREATE OR REPLACE FUNCTION public.set_user_as_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE id = (SELECT id FROM auth.users WHERE email = user_email);
END;
$$;

-- Use the function to ensure admin1@gmail.com is set as admin
SELECT public.set_user_as_admin('admin1@gmail.com');