-- ====================================================================
-- PHASE 13: FIX QUESTIONS RLS
-- Allow users to create and manage their own questions
-- ====================================================================

-- 1. Ensure creator_id column exists (from 002, but double check)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 3. SELECT Policy (Already exists as public, but ensuring it works for authenticated too)
DROP POLICY IF EXISTS "Public read questions" ON public.questions;
CREATE POLICY "Public read questions" ON public.questions FOR SELECT TO public USING (true);

-- 4. INSERT Policy (Allow authenticated users to create questions with their ID)
DROP POLICY IF EXISTS "Users can create questions" ON public.questions;
CREATE POLICY "Users can create questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

-- 5. UPDATE Policy (Only creator can update)
DROP POLICY IF EXISTS "Users can update own questions" ON public.questions;
CREATE POLICY "Users can update own questions" ON public.questions FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

-- 6. DELETE Policy (Only creator can delete)
DROP POLICY IF EXISTS "Users can delete own questions" ON public.questions;
CREATE POLICY "Users can delete own questions" ON public.questions FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- 7. Grant permissions
GRANT ALL ON TABLE public.questions TO authenticated;