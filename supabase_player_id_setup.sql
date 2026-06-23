-- ========================================================================================
-- POKER REPUBLIC - PLAYER MEMBER ID GENERATION
-- Run this in your Supabase SQL Editor.
-- ========================================================================================

-- 1. Add member_id column if it doesn't exist
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS member_id VARCHAR(10) UNIQUE;

-- 2. Create the generation function
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS TRIGGER AS $$
DECLARE
    new_id VARCHAR(10);
    is_unique BOOLEAN := FALSE;
    first_initial VARCHAR(1);
    random_digits VARCHAR(4);
BEGIN
    -- Only generate if not provided
    IF NEW.member_id IS NULL THEN
        -- Get first letter of first name (uppercase), default to 'X' if empty
        IF NEW.first_name IS NOT NULL AND length(NEW.first_name) > 0 THEN
            first_initial := upper(substr(NEW.first_name, 1, 1));
        ELSE
            first_initial := 'X';
        END IF;

        -- Loop to ensure uniqueness
        WHILE NOT is_unique LOOP
            -- Generate 4 random digits
            random_digits := lpad(floor(random() * 10000)::text, 4, '0');
            new_id := first_initial || random_digits;
            
            -- Check if exists
            PERFORM 1 FROM public.players WHERE member_id = new_id;
            IF NOT FOUND THEN
                is_unique := TRUE;
                NEW.member_id := new_id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger to fire before insert
DROP TRIGGER IF EXISTS set_member_id_trigger ON public.players;

CREATE TRIGGER set_member_id_trigger
BEFORE INSERT ON public.players
FOR EACH ROW
EXECUTE FUNCTION generate_member_id();

-- 4. Backfill existing players (if any)
-- This block updates players that were created before this script
DO $$
DECLARE
    player_record RECORD;
BEGIN
    FOR player_record IN SELECT id, first_name FROM public.players WHERE member_id IS NULL LOOP
        UPDATE public.players SET member_id = (
            SELECT (
                COALESCE(upper(substr(player_record.first_name, 1, 1)), 'X') || 
                lpad(floor(random() * 10000)::text, 4, '0')
            )
        ) WHERE id = player_record.id;
    END LOOP;
END;
$$;
