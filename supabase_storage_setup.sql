-- ========================================================================================
-- POKER MANAGEMENT - STORAGE BUCKETS & POLICIES
-- Run this in your Supabase SQL Editor.
-- ========================================================================================

-- 1. Create the Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('player-profiles', 'player-profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('kyc-documents', 'kyc-documents', false, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS for 'player-profiles' (Publicly readable, Admin insertable)
CREATE POLICY "Public Profile Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'player-profiles');

CREATE POLICY "Admins Upload Profile Images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'player-profiles' AND auth.role() = 'authenticated');

-- 3. RLS for 'kyc-documents' (Highly Restricted)
-- Only Super Admins and Managers can read KYC documents. Any authenticated staff can upload them during registration.
CREATE POLICY "Strict Read KYC Documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'kyc-documents' 
  AND EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Super Admin', 'Manager'))
);

CREATE POLICY "Admins Upload KYC Documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'kyc-documents' AND auth.role() = 'authenticated');

-- End of File
