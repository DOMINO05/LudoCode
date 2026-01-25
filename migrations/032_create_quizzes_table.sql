-- ====================================================================
-- PHASE 12: CREATE/RENAME QUIZ TABLES
-- Align database schema with frontend expectations (quizzes, quiz_submissions)
-- ====================================================================

-- 1. Rename custom_quizzes to quizzes if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_quizzes') THEN
        ALTER TABLE public.custom_quizzes RENAME TO quizzes;
    END IF;
END $$;

-- 2. Create quizzes table if not exists
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_public boolean DEFAULT false,
  share_code varchar(6) UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Quiz Questions Table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index int NOT NULL
);

-- 4. Rename user_quiz_attempts to quiz_submissions if exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_quiz_attempts') THEN
        ALTER TABLE public.user_quiz_attempts RENAME TO quiz_submissions;
    END IF;
END $$;

-- 5. Create quiz_submissions table if not exists
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score int NOT NULL,
  max_score int NOT NULL,
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_creator ON public.quizzes(creator_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_public ON public.quizzes(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_quizzes_share_code ON public.quizzes(share_code);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz ON public.quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user ON public.quiz_submissions(user_id);

-- 7. Update RPC to use new table name
CREATE OR REPLACE FUNCTION public.complete_quiz_attempt(
    p_quiz_id uuid,
    p_score int,
    p_max_score int
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_xp_gain int := 0;
    v_gem_gain int := 0;
    v_new_badges jsonb := '[]'::jsonb;
    v_badge record;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Record the attempt (using new table name)
    INSERT INTO public.quiz_submissions (quiz_id, user_id, score, max_score, completed_at)
    VALUES (p_quiz_id, v_user_id, p_score, p_max_score, now());

    -- 2. Award XP/Gems for participation
    v_xp_gain := 30; -- Base XP for finishing a quiz
    v_gem_gain := 2; -- Base Gems

    UPDATE public.profiles 
    SET xp = xp + v_xp_gain,
        gems = gems + v_gem_gain
    WHERE id = v_user_id;

    -- 3. Update challenges
    BEGIN
        UPDATE public.user_challenges 
        SET current_value = LEAST(goal_value, current_value + 1),
            is_completed = (current_value + 1 >= goal_value)
        WHERE user_id = v_user_id 
          AND action_type = 'PLAY_QUIZ' 
          AND is_completed = false 
          AND expires_at > now();
    EXCEPTION WHEN OTHERS THEN
    END;

    -- 4. Check for badges
    FOR v_badge IN SELECT * FROM public.check_and_award_badges(v_user_id) LOOP
        v_new_badges := v_new_badges || jsonb_build_object(
            'id', v_badge.badge_id,
            'name', v_badge.name,
            'icon_path', v_badge.icon_path
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'xp_gain', v_xp_gain,
        'gem_gain', v_gem_gain,
        'newBadges', v_new_badges
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_quiz_attempt(uuid, int, int) TO authenticated;

-- 8. Share Code Trigger (adapted for quizzes table)
CREATE OR REPLACE FUNCTION set_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    LOOP
      NEW.share_code := generate_share_code();
      BEGIN
        PERFORM 1 FROM public.quizzes WHERE share_code = NEW.share_code;
        IF NOT FOUND THEN
          EXIT;
        END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_share_code ON public.quizzes;
CREATE TRIGGER trigger_set_share_code
  BEFORE INSERT ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION set_share_code();