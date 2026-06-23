-- Run this in your Supabase SQL Editor to grant yourself Super Admin access
-- and clear out any duplicate test data you may have created.

-- 1. Ensure you are a Super Admin
UPDATE public.admins
SET role = 'Super Admin'
WHERE email = 'gravitygraver@gmail.com';

-- 2. Remove duplicate players (keeps the most recently created one based on phone number)
DELETE FROM public.players a
USING public.players b
WHERE a.phone_number = b.phone_number 
  AND a.id > b.id;

-- 3. If you meant you want to delete ALL test players, uncomment the line below:
-- DELETE FROM public.players;

-- 4. If you have duplicate staff/admins (which shouldn't happen due to the unique constraint),
-- this will clean them up based on email, keeping the first one:
DELETE FROM public.admins a
USING public.admins b
WHERE a.email = b.email 
  AND a.id > b.id;
