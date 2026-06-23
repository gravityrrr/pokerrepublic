-- ========================================================================================
-- POKER MANAGEMENT - REALTIME CONFIGURATION
-- Run this in your Supabase SQL Editor.
-- ========================================================================================

-- By default, Supabase Realtime is disabled for user tables to conserve bandwidth.
-- This command adds the 'players', 'sessions', and 'alerts' tables to the publication,
-- meaning any INSERT, UPDATE, or DELETE on these tables will be broadcast to subscribed 
-- frontend clients instantly.

-- Note: Ensure that the 'supabase_realtime' publication exists. If not, it will be created.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication 
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  END IF;
END $$;

-- Add specific tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- End of File
