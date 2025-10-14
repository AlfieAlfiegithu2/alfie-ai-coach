-- Grant admin role to current admin user
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT 
  u.id,
  'admin'::app_role,
  u.id
FROM auth.users u
WHERE u.email = 'ryutimo520@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;