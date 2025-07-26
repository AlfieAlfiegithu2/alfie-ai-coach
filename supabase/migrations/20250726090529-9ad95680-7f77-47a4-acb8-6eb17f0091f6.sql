-- Fix security issues from linter

-- 1. Fix RLS policy for admin_users table (admin_users needs proper policies)
CREATE POLICY "Admin users can view themselves" ON public.admin_users 
FOR SELECT USING (false); -- Admins will access this through edge functions

CREATE POLICY "No direct admin user modifications" ON public.admin_users 
FOR ALL USING (false) WITH CHECK (false);

-- 2. Fix search_path for function security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;