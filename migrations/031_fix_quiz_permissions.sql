-- ====================================================================
-- PHASE 11: FIX QUIZ AND CHALLENGE PERMISSIONS
-- Ensure authenticated users can access all necessary tables
-- ====================================================================

-- 1. Grant Access to Authenticated Users
GRANT ALL ON TABLE public.quizzes TO authenticated;
GRANT ALL ON TABLE public.quiz_questions TO authenticated;
GRANT ALL ON TABLE public.challenge_templates TO authenticated;
GRANT ALL ON TABLE public.user_challenges TO authenticated;
GRANT ALL ON TABLE public.user_submissions TO authenticated;
GRANT ALL ON TABLE public.user_concept_mastery TO authenticated;
GRANT ALL ON TABLE public.user_inventory TO authenticated;
GRANT ALL ON TABLE public.shop_items TO authenticated;
GRANT ALL ON TABLE public.shared_snippets TO authenticated;

-- Also grant sequences access for ID generation
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. Ensure RLS Policies for Quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can read public quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON public.quizzes;

CREATE POLICY "Users can read own quizzes" ON public.quizzes FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Users can read public quizzes" ON public.quizzes FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Users can create quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own quizzes" ON public.quizzes FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- 3. Ensure RLS Policies for Quiz Questions
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage questions for own quizzes" ON public.quiz_questions;
-- Policy using a subquery to check quiz ownership/visibility
CREATE POLICY "Users can manage questions for own quizzes" ON public.quiz_questions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_questions.quiz_id AND creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can read questions for public quizzes" ON public.quiz_questions;
CREATE POLICY "Users can read questions for public quizzes" ON public.quiz_questions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_questions.quiz_id AND is_public = true)
);

-- 4. Ensure RLS Policies for Challenges
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own challenges" ON public.user_challenges;
CREATE POLICY "Users can manage own challenges" ON public.user_challenges FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Challenge Templates: Read only
ALTER TABLE public.challenge_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read challenge templates" ON public.challenge_templates;
CREATE POLICY "Anyone can read challenge templates" ON public.challenge_templates FOR SELECT TO authenticated USING (true);

-- 5. Shared Snippets
ALTER TABLE public.shared_snippets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read snippets" ON public.shared_snippets;
CREATE POLICY "Anyone can read snippets" ON public.shared_snippets FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can create snippets" ON public.shared_snippets;
CREATE POLICY "Users can create snippets" ON public.shared_snippets FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own/editable snippets" ON public.shared_snippets;
CREATE POLICY "Users can update own/editable snippets" ON public.shared_snippets FOR UPDATE TO public USING (
    (creator_id = auth.uid()) OR (is_editable = true)
);