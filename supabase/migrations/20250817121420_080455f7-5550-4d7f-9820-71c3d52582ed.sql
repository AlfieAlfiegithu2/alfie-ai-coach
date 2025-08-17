-- Create a test admin user with password "testpass123" (8+ characters)
-- First, let's check if we need to clean up any test users
DELETE FROM admin_users WHERE email = 'test@admin.com';

-- Insert test admin (password will be hashed by the edge function during registration)
-- This is just for verification that the system works