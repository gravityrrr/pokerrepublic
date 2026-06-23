CREATE OR REPLACE FUNCTION public.delete_staff_user(staff_id UUID)
RETURNS void AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Verify the caller is an Admin
  SELECT role INTO caller_role FROM public.admins WHERE id = auth.uid();
  IF caller_role NOT IN ('Admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only Admins can delete staff accounts.';
  END IF;

  -- Delete the user from auth.users (this cascades to public.admins automatically)
  DELETE FROM auth.users WHERE id = staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
