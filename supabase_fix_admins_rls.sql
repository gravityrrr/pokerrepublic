-- Run this in your Supabase SQL Editor to fix the Admins/Staff RLS Errors

-- 1. Ensure RLS is enabled on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing broken policies just in case
DROP POLICY IF EXISTS "Authenticated Admins Full Access" ON public.admins;
DROP POLICY IF EXISTS "Admins Read" ON public.admins;
DROP POLICY IF EXISTS "Admins Update" ON public.admins;

-- 3. Allow all logged-in staff to read the admin directory (fixes "Could not fetch user role")
CREATE POLICY "Admins Read" ON public.admins 
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Allow logged-in staff to update profiles (needed for avatar uploads and super admins editing staff)
CREATE POLICY "Admins Update" ON public.admins 
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. Fix Staff Attendance RLS (Allow staff to log attendance)
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff Attendance Access" ON public.staff_attendance;

CREATE POLICY "Staff Attendance Access" ON public.staff_attendance 
  FOR ALL USING (auth.role() = 'authenticated');
