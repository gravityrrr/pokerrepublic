-- Run this in your Supabase SQL Editor to add the avatar column
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS avatar_url TEXT;
