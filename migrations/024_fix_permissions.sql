-- ====================================================================
-- PHASE 4: PERMISSION FIXES
-- Explicitly grant permissions to authenticated and anon roles
-- ====================================================================

-- 1. Grant usage on schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant access to all tables for authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- 3. Grant select access to public tables for anon users (if needed for landing page etc)
GRANT SELECT ON public.languages TO anon;
GRANT SELECT ON public.dictionary TO anon;
GRANT SELECT ON public.quotes TO anon;
GRANT SELECT ON public.badges TO anon;
GRANT SELECT ON public.shop_items TO anon;

-- 4. Re-apply crucial RLS policies just in case
-- Drop existing policies to avoid conflicts/duplication logic issues
DROP POLICY IF EXISTS "Public read languages" ON public.languages;
CREATE POLICY "Public read languages" ON public.languages FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public read dictionary" ON public.dictionary;
CREATE POLICY "Public read dictionary" ON public.dictionary FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public profiles for leaderboard" ON public.profiles;
CREATE POLICY "Public profiles for leaderboard" ON public.profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 5. Fix RPC security (ensure they are accessible)
GRANT EXECUTE ON FUNCTION claim_daily_bonus() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_placement(float) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_submission(uuid, boolean, text, int, int) TO authenticated;
