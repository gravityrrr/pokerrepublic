-- Drop the existing constraint that restricts roles
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_role_check;

-- Migrate existing rows to the new roles so the constraint doesn't fail
UPDATE public.admins SET role = 'Admin' WHERE role IN ('Super Admin', 'Manager');
UPDATE public.admins SET role = 'Staff' WHERE role NOT IN ('Admin', 'Staff');

-- Add it back with 'Staff' and 'Admin' only
ALTER TABLE public.admins ADD CONSTRAINT admins_role_check 
  CHECK (role IN ('Staff', 'Admin'));

-- Also update the trigger to use 'Staff' instead of 'Check-in Staff' by default
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admins (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Staff Member'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Staff'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
