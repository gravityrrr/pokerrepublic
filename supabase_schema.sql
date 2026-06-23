-- ========================================================================================
-- POKER MANAGEMENT ADMIN DASHBOARD - SUPABASE SQL SCHEMA
-- Execute this entirely in the Supabase SQL Editor.
-- It will set up Tables, RLS Policies, Functions, Triggers, and basic Seed Data.
-- ========================================================================================

-- ----------------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------------------
-- 2. TABLES
-- ----------------------------------------------------------------------------------------

-- a. Admin Users (Extend default auth.users if needed, or use a separate table synced with auth)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Super Admin', 'Manager', 'Floor Admin', 'Analyst', 'Check-in Staff')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- b. Players
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    date_of_birth DATE,
    address TEXT,
    emergency_contact TEXT,
    loyalty_score INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    kyc_status TEXT DEFAULT 'Pending' CHECK (kyc_status IN ('Pending', 'Verified', 'Rejected')),
    internal_notes TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- c. Tags (Master list of available tags)
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#808080',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- d. Player Tags (Many-to-Many mapping)
CREATE TABLE IF NOT EXISTS public.player_tags (
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID REFERENCES public.admins(id),
    PRIMARY KEY (player_id, tag_id)
);

-- e. Player Documents (For KYC: Aadhaar, PAN, etc.)
CREATE TABLE IF NOT EXISTS public.player_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('Aadhaar', 'PAN', 'Passport', 'Driving License', 'Other')),
    document_number TEXT,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage Bucket
    uploaded_by UUID REFERENCES public.admins(id),
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.admins(id)
);

-- f. Game Modes
CREATE TABLE IF NOT EXISTS public.game_modes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- g. Tables (Physical or Virtual Poker Tables)
CREATE TABLE IF NOT EXISTS public.poker_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    game_mode_id UUID REFERENCES public.game_modes(id),
    max_seats INTEGER NOT NULL DEFAULT 9,
    status TEXT DEFAULT 'Closed' CHECK (status IN ('Active', 'Empty', 'Full', 'Waiting', 'Closed')),
    stakes TEXT, -- e.g. "100/200"
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- h. Sessions (Check-in / Check-out records)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.poker_tables(id),
    check_in_time TIMESTAMPTZ DEFAULT now(),
    check_out_time TIMESTAMPTZ,
    duration_minutes INTEGER, -- Calculated on checkout
    buy_in_amount DECIMAL(12,2) DEFAULT 0,
    cash_out_amount DECIMAL(12,2) DEFAULT 0,
    net_result DECIMAL(12,2) GENERATED ALWAYS AS (cash_out_amount - buy_in_amount) STORED,
    checked_in_by UUID REFERENCES public.admins(id),
    checked_out_by UUID REFERENCES public.admins(id),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled'))
);

-- i. Session Transactions (Top-ups, partial cashouts during a session)
CREATE TABLE IF NOT EXISTS public.session_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Buy-in', 'Top-up', 'Cash-out')),
    amount DECIMAL(12,2) NOT NULL,
    transaction_time TIMESTAMPTZ DEFAULT now(),
    handled_by UUID REFERENCES public.admins(id)
);

-- j. Notes (Timestamped admin notes on players)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.admins(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- k. Alerts (System generated or manual alerts)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    severity TEXT DEFAULT 'Info' CHECK (severity IN ('Info', 'Warning', 'Critical')),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.admins(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- l. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.admins(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ----------------------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------------------
CREATE INDEX idx_players_phone ON public.players(phone_number);
CREATE INDEX idx_sessions_player ON public.sessions(player_id);
CREATE INDEX idx_sessions_table ON public.sessions(table_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX idx_alerts_unresolved ON public.alerts(is_resolved) WHERE is_resolved = false;


-- ----------------------------------------------------------------------------------------
-- 4. FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------------------

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON public.players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_poker_tables_updated_at
    BEFORE UPDATE ON public.poker_tables
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to calculate duration on checkout
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_out_time IS NOT NULL AND OLD.check_out_time IS NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_duration_on_checkout
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE PROCEDURE calculate_session_duration();


-- ----------------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------------------
-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: In a true Supabase setup, you'd link public.admins with auth.uid().
-- For simplicity, we assume any authenticated user with an entry in `admins` can read/write everything 
-- (You can refine these policies based on admin.role later)

CREATE POLICY "Authenticated Admins Full Access" ON public.admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.players FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.player_tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.player_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.game_modes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.poker_tables FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.session_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.notes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.alerts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Admins Full Access" ON public.audit_logs FOR ALL USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------------------------------------
-- 6. VIEWS
-- ----------------------------------------------------------------------------------------
-- Player Analytics View
CREATE OR REPLACE VIEW public.vw_player_analytics WITH (security_invoker = true) AS
SELECT 
    p.id as player_id,
    p.first_name || ' ' || p.last_name as full_name,
    COUNT(s.id) as total_visits,
    MAX(s.check_in_time) as last_visit,
    COALESCE(AVG(s.duration_minutes), 0) as avg_session_duration_mins,
    COALESCE(AVG(s.buy_in_amount), 0) as avg_buy_in,
    COALESCE(AVG(s.cash_out_amount), 0) as avg_cash_out,
    COALESCE(SUM(s.net_result), 0) as lifetime_net_result
FROM public.players p
LEFT JOIN public.sessions s ON p.id = s.player_id AND s.status = 'Completed'
GROUP BY p.id;

-- Dashboard Summary View
CREATE OR REPLACE VIEW public.vw_dashboard_summary WITH (security_invoker = true) AS
SELECT
    (SELECT COUNT(*) FROM public.players) as total_registered_players,
    (SELECT COUNT(*) FROM public.sessions WHERE status = 'Active') as players_currently_playing,
    (SELECT COUNT(*) FROM public.sessions WHERE DATE(check_in_time) = CURRENT_DATE) as sessions_today,
    (SELECT COALESCE(AVG(duration_minutes), 0) FROM public.sessions WHERE status = 'Completed' AND DATE(check_in_time) = CURRENT_DATE) as avg_session_duration_today_mins;


-- ----------------------------------------------------------------------------------------
-- 7. SEED DATA
-- ----------------------------------------------------------------------------------------
INSERT INTO public.tags (name, color) VALUES 
('New', '#3B82F6'),
('Regular', '#10B981'),
('VIP', '#8B5CF6'),
('Suspended', '#F59E0B'),
('Watchlist', '#EF4444'),
('Blacklisted', '#000000') ON CONFLICT DO NOTHING;

INSERT INTO public.game_modes (name, description, is_active) VALUES 
('Texas Hold''em', 'No Limit Texas Hold''em', true),
('Omaha', 'Pot Limit Omaha', true),
('Seven Card Stud', 'Fixed Limit Seven Card Stud', true),
('Tournament', 'Standard Tournament', true) ON CONFLICT DO NOTHING;

-- End of File
