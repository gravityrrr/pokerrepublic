-- This script comprehensively updates all Row Level Security (RLS) policies 
-- to recognize the simplified 'Admin' and 'Staff' roles, replacing the old 
-- granular roles (Check-in Staff, Super Admin, etc.) that were blocking access.

-- 1. Sessions
DROP POLICY IF EXISTS "Staff Session Access" ON public.sessions;
DROP POLICY IF EXISTS "Managers can update any session" ON public.sessions;
DROP POLICY IF EXISTS "Staff can only update active sessions" ON public.sessions;
CREATE POLICY "Sessions Access" ON public.sessions 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Admin', 'Staff'))
  );

-- 2. Players
DROP POLICY IF EXISTS "Staff Player Access" ON public.players;
CREATE POLICY "Players Access" ON public.players 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Admin', 'Staff'))
  );

-- 3. Player Documents
DROP POLICY IF EXISTS "Staff Document Access" ON public.player_documents;
CREATE POLICY "Player Documents Access" ON public.player_documents 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Admin', 'Staff'))
  );

-- 4. Audit Logs
DROP POLICY IF EXISTS "Strict Read Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Audit Logs Access" ON public.audit_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role = 'Admin')
  );

-- 5. Staff Attendance
DROP POLICY IF EXISTS "Staff Attendance Access" ON public.staff_attendance;
DROP POLICY IF EXISTS "Staff read own attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Managers read all attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Staff check in" ON public.staff_attendance;
DROP POLICY IF EXISTS "Staff check out" ON public.staff_attendance;
CREATE POLICY "Attendance Access" ON public.staff_attendance 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role = 'Admin')
    OR admin_id = auth.uid()
  );

-- 6. Alerts
DROP POLICY IF EXISTS "Staff Alerts Access" ON public.alerts;
CREATE POLICY "Alerts Access" ON public.alerts 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Admin', 'Staff'))
  );

-- 7. Session Transactions
DROP POLICY IF EXISTS "Authenticated Admins Full Access" ON public.session_transactions;
CREATE POLICY "Session Transactions Access" ON public.session_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Admin', 'Staff'))
  );

-- 8. Poker Tables
DROP POLICY IF EXISTS "Authenticated Admins Full Access" ON public.poker_tables;
CREATE POLICY "Poker Tables Access" ON public.poker_tables
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND role IN ('Admin', 'Staff'))
  );
