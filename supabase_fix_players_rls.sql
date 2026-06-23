-- Run this in your Supabase SQL Editor to fix the Player Registration RLS Error

-- 1. Ensure RLS is enabled
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing broken policies just in case
DROP POLICY IF EXISTS "Authenticated Admins Full Access" ON public.players;
DROP POLICY IF EXISTS "Staff Player Access" ON public.players;

-- 3. Create the correct policy allowing staff to insert and select players
CREATE POLICY "Staff Player Access" ON public.players 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- 4. Do the same for player documents
ALTER TABLE public.player_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff Document Access" ON public.player_documents;

CREATE POLICY "Staff Document Access" ON public.player_documents 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );
