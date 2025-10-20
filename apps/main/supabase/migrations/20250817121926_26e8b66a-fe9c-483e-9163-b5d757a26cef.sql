-- Update the current user to have admin role so they can access the admin panel
UPDATE profiles 
SET role = 'admin' 
WHERE id = '60707817-5f7d-4fc8-ad5f-95570476ccfa';