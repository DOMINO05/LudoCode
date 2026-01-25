-- ====================================================================
-- PHASE 5: DATA RECOVERY
-- Fix missing profiles for existing users
-- ====================================================================

DO $$
DECLARE
    r RECORD;
    v_username text;
    v_base_username text;
BEGIN
    FOR r IN SELECT * FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles) LOOP
        
        v_base_username := COALESCE(r.raw_user_meta_data->>'username', split_part(r.email, '@', 1));
        v_username := v_base_username;
        
        -- Try insert with original username
        BEGIN
            INSERT INTO public.profiles (id, username, xp, gems, sanity_points, current_streak, created_at)
            VALUES (
                r.id, 
                v_username, 
                0, 
                0, 
                100, 
                0, 
                r.created_at
            );
        EXCEPTION WHEN unique_violation THEN
            -- If failed, try appending suffix
            v_username := v_base_username || '_' || substr(r.id::text, 1, 4);
            
            BEGIN
                INSERT INTO public.profiles (id, username, xp, gems, sanity_points, current_streak, created_at)
                VALUES (
                    r.id, 
                    v_username, 
                    0, 
                    0, 
                    100, 
                    0, 
                    r.created_at
                );
            EXCEPTION WHEN unique_violation THEN
                -- If still failed, append random number
                v_username := v_base_username || '_' || floor(random() * 1000)::text;
                INSERT INTO public.profiles (id, username, xp, gems, sanity_points, current_streak, created_at)
                VALUES (
                    r.id, 
                    v_username, 
                    0, 
                    0, 
                    100, 
                    0, 
                    r.created_at
                );
            END;
        END;
        
    END LOOP;
END $$;

-- 2. Ensure trigger exists for future users (standard Supabase pattern)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, xp, gems, sanity_points, current_streak)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    0,
    0,
    100,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION 
  WHEN unique_violation THEN
    -- Fallback with suffix if username taken
    INSERT INTO public.profiles (id, username, xp, gems, sanity_points, current_streak)
    VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 4),
      0,
      0,
      100,
      0
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();