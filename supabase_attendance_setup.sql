-- ========================================================================================
-- POKER MANAGEMENT - STAFF ATTENDANCE & IMMUTABILITY
-- Run this in your Supabase SQL Editor.
-- ========================================================================================

-- 1. Create Staff Attendance Table
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL, -- Logical reference to public.admins(id) or auth.users(id)
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    shift_date DATE DEFAULT CURRENT_DATE
);

-- Note: We can't strictly enforce foreign key to public.admins(id) if admins(id) is just pointing to auth.users, 
-- but since admins id IS the auth.uid, we will enforce it logically.

-- 2. Enable RLS on attendance
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for staff_attendance
-- Staff can read their own attendance
CREATE POLICY "Staff read own attendance"
    ON public.staff_attendance FOR SELECT
    USING (admin_id = auth.uid());

-- Super Admins/Managers read all attendance
CREATE POLICY "Managers read all attendance"
    ON public.staff_attendance FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.admins 
        WHERE id = auth.uid() AND role IN ('Super Admin', 'Manager')
    ));

-- Staff can insert their own attendance (check in)
CREATE POLICY "Staff check in"
    ON public.staff_attendance FOR INSERT
    WITH CHECK (admin_id = auth.uid());

-- Staff can update their own attendance (check out)
CREATE POLICY "Staff check out"
    ON public.staff_attendance FOR UPDATE
    USING (admin_id = auth.uid());

-- ==========================================
-- 4. IMMUTABLE HISTORY ENFORCEMENT
-- ==========================================

-- A. Audit Logs are absolutely immutable
-- Drop any existing UPDATE or DELETE policies on audit_logs if they exist
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.audit_logs;
-- Recreate strictly:
CREATE POLICY "Super Admins read audit logs"
    ON public.audit_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.admins 
        WHERE id = auth.uid() AND role IN ('Super Admin', 'Manager')
    ));
-- Note: There is NO UPDATE or DELETE policy for audit_logs. It is append-only by default now.

-- B. Sessions Immutability
-- Currently, sessions have a "Enable update for authenticated users" policy. We need to restrict it.
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.sessions;

-- Allow Super Admins/Managers to update anything
CREATE POLICY "Managers can update any session"
    ON public.sessions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.admins 
        WHERE id = auth.uid() AND role IN ('Super Admin', 'Manager')
    ));

-- Check-in Staff can ONLY update a session if it is currently 'Active' or 'Paused'. 
-- Once it's 'Completed' or 'Cancelled', they cannot touch it.
CREATE POLICY "Staff can only update active sessions"
    ON public.sessions FOR UPDATE
    USING (
        status IN ('Active', 'Paused') 
        AND EXISTS (
            SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Check-in Staff', 'Floor Admin')
        )
    );

-- End of File
