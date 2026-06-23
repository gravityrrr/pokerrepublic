-- Run this in your Supabase SQL Editor to sync missing users

-- This fixes the issue where a user exists in Authentication, 
-- but their profile is missing from the public.admins table.
-- This happens if the user was created before the auto-sync trigger was added.

INSERT INTO public.admins (id, email, full_name, role, is_active)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Super Admin'), 
  COALESCE(raw_user_meta_data->>'role', 'Super Admin'), 
  true
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Also, let's make sure your specific email is guaranteed to be a Super Admin
UPDATE public.admins 
SET role = 'Super Admin'
WHERE email = 'gravitygraver@gmail.com'; -- Replace with your actual login email if different
