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
  -- Verify the caller is an Admin
  SELECT role INTO caller_role FROM public.admins WHERE id = auth.uid();
  IF caller_role NOT IN ('Admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only Admins can create staff accounts.';
  END IF;

  new_user_id := gen_random_uuid();
  
  -- Insert into Supabase internal auth schema
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', staff_email, 
    crypt(staff_password, gen_salt('bf', 10)), 
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
