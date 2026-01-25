-- ====================================================================
-- PHASE 1: RLS HARDENING MIGRATION
-- Enables RLS on all tables and sets up appropriate security policies
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.concept_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.question_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dictionary ENABLE ROW LEVEL SECURITY;

-- 2. Public Read Policies (Anyone can view these tables)
DO $$ 
BEGIN
    -- Languages
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'languages' AND policyname = 'Public read languages') THEN
        CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (true);
    END IF;

    -- Concepts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concepts' AND policyname = 'Public read concepts') THEN
        CREATE POLICY "Public read concepts" ON public.concepts FOR SELECT USING (true);
    END IF;

    -- Concept Prerequisites
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'concept_prerequisites' AND policyname = 'Public read concept_prerequisites') THEN
        CREATE POLICY "Public read concept_prerequisites" ON public.concept_prerequisites FOR SELECT USING (true);
    END IF;

    -- Questions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questions' AND policyname = 'Public read questions') THEN
        CREATE POLICY "Public read questions" ON public.questions FOR SELECT USING (true);
    END IF;

    -- Question Concepts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'question_concepts' AND policyname = 'Public read question_concepts') THEN
        CREATE POLICY "Public read question_concepts" ON public.question_concepts FOR SELECT USING (true);
    END IF;

    -- Shop Items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shop_items' AND policyname = 'Public read shop_items') THEN
        CREATE POLICY "Public read shop_items" ON public.shop_items FOR SELECT USING (true);
    END IF;

    -- Challenge Templates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenge_templates' AND policyname = 'Public read challenge_templates') THEN
        CREATE POLICY "Public read challenge_templates" ON public.challenge_templates FOR SELECT USING (true);
    END IF;

    -- Badges
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'badges' AND policyname = 'Public read badges') THEN
        CREATE POLICY "Public read badges" ON public.badges FOR SELECT USING (true);
    END IF;

    -- Quotes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'Public read quotes') THEN
        CREATE POLICY "Public read quotes" ON public.quotes FOR SELECT USING (true);
    END IF;

    -- Dictionary (already exists in 008 but for safety)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dictionary' AND policyname = 'Public read dictionary') THEN
        CREATE POLICY "Public read dictionary" ON public.dictionary FOR SELECT USING (true);
    END IF;
END $$;

-- 3. Private / Own Data Policies

-- Profiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
    -- Select already exists from schema.sql, but ensuring it's here
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Read own profile') THEN
        CREATE POLICY "Read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
END $$;

-- User Concept Mastery
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_concept_mastery' AND policyname = 'Users can manage own mastery') THEN
        CREATE POLICY "Users can manage own mastery" ON public.user_concept_mastery FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- User Submissions
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_submissions' AND policyname = 'Users can read own submissions') THEN
        CREATE POLICY "Users can read own submissions" ON public.user_submissions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    -- Insert already exists from schema.sql
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_submissions' AND policyname = 'Insert own submissions') THEN
        CREATE POLICY "Insert own submissions" ON public.user_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- User Inventory
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_inventory' AND policyname = 'Users can manage own inventory') THEN
        CREATE POLICY "Users can manage own inventory" ON public.user_inventory FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- User Challenges
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_challenges' AND policyname = 'Users can manage own challenges') THEN
        CREATE POLICY "Users can manage own challenges" ON public.user_challenges FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- User Badges
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'Users can read own badges') THEN
        CREATE POLICY "Users can read own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Additional Protection: Hide usernames/profiles from others unless we want a leaderboard
-- If a leaderboard is needed, we need a public read for profiles but restricted to some columns
-- For Phase 1, we stick to "only own rows" as per changes.md, but a leaderboard is mentioned in Phase 4.
-- We can add a policy for leaderboard:
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles for leaderboard') THEN
        CREATE POLICY "Public profiles for leaderboard" ON public.profiles FOR SELECT USING (true);
    END IF;
END $$;
-- Note: In a real app, we might want to restrict columns, but RLS works on rows.
-- Supabase allows column-level security via views or by just not selecting them, 
-- but RLS only manages row access.