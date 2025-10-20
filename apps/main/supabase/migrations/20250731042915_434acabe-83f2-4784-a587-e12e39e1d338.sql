-- Update the current authenticated user to admin role
-- You can change this to make a specific user admin by using their email
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'cbd0b1d9-c209-484c-a25c-f36a3b8071bb'; -- The user 江梦淋 who likely needs admin access

-- Alternatively, if you want both users to be admin:
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN ('cbd0b1d9-c209-484c-a25c-f36a3b8071bb', 'f59cee5f-07f3-452b-9540-a80f657d4630');