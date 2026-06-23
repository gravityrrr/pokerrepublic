-- Run this in your Supabase SQL Editor to automatically generate real alerts

-- 1. Fix permissions to allow staff to insert/update alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff Alerts Access" ON public.alerts;
CREATE POLICY "Staff Alerts Access" ON public.alerts 
  FOR ALL USING (auth.role() = 'authenticated');

-- 2. Alert for New Player Registration
CREATE OR REPLACE FUNCTION public.alert_on_new_player()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.alerts (title, description, player_id, severity)
  VALUES (
    'New Player Registration', 
    'A new player (' || NEW.first_name || ' ' || NEW.last_name || ') has joined Poker Republic.', 
    NEW.id, 
    'Info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_alert_new_player ON public.players;
CREATE TRIGGER trg_alert_new_player
  AFTER INSERT ON public.players
  FOR EACH ROW EXECUTE PROCEDURE public.alert_on_new_player();


-- 3. Alert for VIP Check-in
CREATE OR REPLACE FUNCTION public.alert_on_vip_checkin()
RETURNS TRIGGER AS $$
DECLARE
  player_loyalty INTEGER;
  p_name TEXT;
BEGIN
  SELECT loyalty_score, first_name || ' ' || last_name INTO player_loyalty, p_name 
  FROM public.players WHERE id = NEW.player_id;

  -- Anyone with a loyalty score over 100 is considered VIP
  IF player_loyalty > 100 THEN
    INSERT INTO public.alerts (title, description, player_id, severity)
    VALUES (
      'VIP Member Check-in', 
      'VIP Player ' || p_name || ' has just checked in to the floor.', 
      NEW.player_id, 
      'Critical'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_alert_vip_checkin ON public.sessions;
CREATE TRIGGER trg_alert_vip_checkin
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE PROCEDURE public.alert_on_vip_checkin();
