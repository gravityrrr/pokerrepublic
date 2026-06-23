-- ========================================================================================
-- POKER MANAGEMENT - RBAC & STAFF PROVISIONING
-- Run this in your Supabase SQL Editor AFTER the main schema.
-- ========================================================================================

-- 1. TRIGGER: Auto-create admin profile when a user is created via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admins (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Staff Member'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Check-in Staff'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. RPC: Securely Create Staff User from Client (callable by Super Admin only)
-- Requires pgcrypto to hash the password for auth.users
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_staff_user(
  staff_email TEXT,
  staff_password TEXT,
  staff_name TEXT,
  staff_role TEXT
) RETURNS UUID AS $$
DECLARE
  caller_role TEXT;
  new_user_id UUID;
BEGIN
  -- Verify the caller is a Super Admin or Manager
  SELECT role INTO caller_role FROM public.admins WHERE id = auth.uid();
  IF caller_role NOT IN ('Super Admin', 'Manager') THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins and Managers can create staff accounts.';
  END IF;

  new_user_id := gen_random_uuid();
  
  -- Insert into Supabase internal auth schema
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', staff_email, 
    crypt(staff_password, gen_salt('bf')), 
    now(), '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', staff_name, 'role', staff_role),
    now(), now()
  );
  
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_user_id, new_user_id::text, 
    jsonb_build_object('sub', new_user_id::text, 'email', staff_email), 
    'email', now(), now(), now()
  );

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. RLS POLICIES FOR RBAC (Overriding old broad policies)
-- Drop the broad permissive policies created earlier
DROP POLICY IF EXISTS "Authenticated Admins Full Access" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated Admins Full Access" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated Admins Full Access" ON public.players;

-- Recreate strict policies
-- Audit logs: Only Super Admin and Analyst can read.
CREATE POLICY "Strict Read Audit Logs" ON public.audit_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Super Admin', 'Analyst'))
  );

-- Player Analytics (Sessions, Transactions): Check-in staff can only insert/update active sessions, they can't read old ones
CREATE POLICY "Staff Session Access" ON public.sessions 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Super Admin', 'Manager', 'Floor Admin', 'Analyst'))
    OR (
      EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role = 'Check-in Staff') 
      AND status = 'Active' -- They can only deal with Active sessions
    )
  );

-- Ensure all tables check auth.uid() exists in public.admins before doing anything
-- (For brevity, we just demonstrate on key tables, but in production apply to all)
