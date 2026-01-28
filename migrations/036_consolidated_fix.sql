-- ====================================================================
-- PHASE 15: CONSOLIDATED SCHEMA AND RPC REPAIR
-- This migration fixes table renames, broken RPCs, and RLS policies
-- ====================================================================

-- 1. Table Renames (Safe)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_quizzes') THEN
        ALTER TABLE public.custom_quizzes RENAME TO quizzes;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_quiz_attempts') THEN
        ALTER TABLE public.user_quiz_attempts RENAME TO quiz_submissions;
    END IF;
END $$;

-- 2. Repair 'is_share_code_taken' (Depends on table names)
DROP FUNCTION IF EXISTS is_share_code_taken(varchar);
CREATE OR REPLACE FUNCTION is_share_code_taken(code varchar)
RETURNS boolean AS $$
BEGIN
  PERFORM 1 FROM public.quizzes WHERE share_code = code;
  IF FOUND THEN RETURN true; END IF;
  
  PERFORM 1 FROM public.shared_snippets WHERE share_code = code;
  IF FOUND THEN RETURN true; END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 3. Repair 'complete_quiz_attempt' (Fixed to use quiz_submissions and return rewards)
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
    v_completed_challenges jsonb := '[]'::jsonb;
    v_badge record;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Record the attempt
    INSERT INTO public.quiz_submissions (quiz_id, user_id, score, max_score, completed_at)
    VALUES (p_quiz_id, v_user_id, p_score, p_max_score, now());

    -- 2. Award XP/Gems for participation
    v_xp_gain := 30; 
    v_gem_gain := 2; 

    UPDATE public.profiles 
    SET xp = xp + v_xp_gain,
        gems = gems + v_gem_gain
    WHERE id = v_user_id;

    -- 3. Update challenges
    BEGIN
        WITH updated AS (
            UPDATE public.user_challenges 
            SET current_value = LEAST(goal_value, current_value + 1),
                is_completed = (current_value + 1 >= goal_value)
            WHERE user_id = v_user_id 
              AND action_type = 'PLAY_QUIZ' 
              AND is_completed = false 
              AND expires_at > now()
            RETURNING id, description, is_completed
        )
        SELECT jsonb_agg(jsonb_build_object('id', id, 'description', description)) 
        INTO v_completed_challenges FROM updated WHERE is_completed = true;
    EXCEPTION WHEN OTHERS THEN
    END;

    -- 4. Check for badges
    BEGIN
        FOR v_badge IN SELECT * FROM public.check_and_award_badges(v_user_id) LOOP
            v_new_badges := v_new_badges || jsonb_build_object(
                'id', v_badge.badge_id,
                'name', v_badge.name,
                'icon_path', v_badge.icon_path
            );
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
    END;

    RETURN jsonb_build_object(
        'success', true,
        'xp_gain', v_xp_gain,
        'gem_gain', v_gem_gain,
        'newBadges', COALESCE(v_new_badges, '[]'::jsonb),
        'completedChallenges', COALESCE(v_completed_challenges, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Repair 'complete_submission' (Merge logic from 012 and 029)
CREATE OR REPLACE FUNCTION public.complete_submission(
    p_question_id uuid,
    p_is_correct boolean,
    p_submitted_answer text,
    p_execution_time_ms int,
    p_streak int DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_xp_gain int := 10;
    v_gem_gain int := 1;
    v_multiplier float := 1.0;
    v_mastery_before float := 0.0;
    v_mastery_after float := 0.0;
    v_concept_count int := 0;
    v_lang_id uuid;
    
    v_record record;
    v_p_prev float;
    v_p_evidence float;
    v_p_new float;
    
    v_new_xp int;
    v_new_gems int;
    v_new_proficiency float;
    v_new_badges jsonb := '[]'::jsonb;
    v_completed_challenges jsonb := '[]'::jsonb;
    v_badge record;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Get question and language info
    SELECT language_id INTO v_lang_id FROM public.questions WHERE id = p_question_id;

    -- 2. Calculate multiplier based on streak
    IF p_is_correct AND p_streak >= 2 THEN
        v_multiplier := 1.3 + (p_streak - 2) * 0.1;
    END IF;

    v_xp_gain := round(v_xp_gain * v_multiplier);
    v_gem_gain := round(v_gem_gain * v_multiplier);

    -- 3. BKT Updates
    FOR v_record IN 
        SELECT qc.concept_id, qc.weight, c.p_init, c.p_transit, c.p_guess, c.p_slip
        FROM public.question_concepts qc
        JOIN public.concepts c ON c.id = qc.concept_id
        WHERE qc.question_id = p_question_id
    LOOP
        BEGIN
            INSERT INTO public.user_concept_mastery (user_id, concept_id, mastery_probability, language_id)
            VALUES (v_user_id, v_record.concept_id, v_record.p_init, v_lang_id)
            ON CONFLICT (user_id, concept_id) DO NOTHING;
        EXCEPTION WHEN undefined_column THEN
            INSERT INTO public.user_concept_mastery (user_id, concept_id, mastery_probability)
            VALUES (v_user_id, v_record.concept_id, v_record.p_init)
            ON CONFLICT (user_id, concept_id) DO NOTHING;
        END;

        SELECT mastery_probability INTO v_p_prev 
        FROM public.user_concept_mastery 
        WHERE user_id = v_user_id AND concept_id = v_record.concept_id;

        v_mastery_before := v_mastery_before + v_p_prev;
        v_concept_count := v_concept_count + 1;

        IF p_is_correct THEN
            v_p_evidence := (v_p_prev * (1 - v_record.p_slip)) / (v_p_prev * (1 - v_record.p_slip) + (1 - v_p_prev) * v_record.p_guess);
        ELSE
            v_p_evidence := (v_p_prev * v_record.p_slip) / (v_p_prev * v_record.p_slip + (1 - v_p_prev) * (1 - v_record.p_guess));
        END IF;

        v_p_new := v_p_evidence + (1 - v_p_evidence) * v_record.p_transit;
        v_p_new := v_p_prev + (v_p_new - v_p_prev) * v_record.weight;
        v_p_new := LEAST(0.99, GREATEST(0.01, v_p_new));

        UPDATE public.user_concept_mastery 
        SET mastery_probability = v_p_new,
            total_attempts = total_attempts + 1,
            last_practiced_at = now()
        WHERE user_id = v_user_id AND concept_id = v_record.concept_id;

        v_mastery_after := v_mastery_after + v_p_new;
    END LOOP;

    IF v_concept_count > 0 THEN
        v_mastery_before := v_mastery_before / v_concept_count;
        v_mastery_after := v_mastery_after / v_concept_count;
    END IF;

    -- 4. Update Profile
    IF p_is_correct THEN
        UPDATE public.profiles 
        SET xp = xp + v_xp_gain,
            gems = gems + v_gem_gain,
            global_proficiency = LEAST(3.0, global_proficiency + 0.02)
        WHERE id = v_user_id
        RETURNING xp, gems, global_proficiency INTO v_new_xp, v_new_gems, v_new_proficiency;
    ELSE
        UPDATE public.profiles 
        SET sanity_points = GREATEST(0, sanity_points - 10)
        WHERE id = v_user_id
        RETURNING xp, gems, global_proficiency INTO v_new_xp, v_new_gems, v_new_proficiency;
    END IF;

    -- 5. Record Submission
    INSERT INTO public.user_submissions (
        user_id, question_id, is_correct, submitted_answer, 
        execution_time_ms, mastery_before, mastery_after
    ) VALUES (
        v_user_id, p_question_id, p_is_correct, p_submitted_answer, 
        p_execution_time_ms, v_mastery_before, v_mastery_after
    );

    -- 6. Update Challenges
    IF p_is_correct THEN
        BEGIN
            WITH updated_solve AS (
                UPDATE public.user_challenges 
                SET current_value = LEAST(goal_value, current_value + 1),
                    is_completed = (current_value + 1 >= goal_value)
                WHERE user_id = v_user_id AND action_type = 'SOLVE_QUESTION' AND is_completed = false AND expires_at > now()
                RETURNING id, description, is_completed
            )
            SELECT jsonb_agg(jsonb_build_object('id', id, 'description', description)) INTO v_completed_challenges FROM updated_solve WHERE is_completed = true;

            WITH updated_gems AS (
                UPDATE public.user_challenges 
                SET current_value = LEAST(goal_value, current_value + v_gem_gain),
                    is_completed = (current_value + v_gem_gain >= goal_value)
                WHERE user_id = v_user_id AND action_type = 'EARN_GEMS' AND is_completed = false AND expires_at > now()
                RETURNING id, description, is_completed
            )
            SELECT v_completed_challenges || COALESCE(jsonb_agg(jsonb_build_object('id', id, 'description', description)), '[]'::jsonb) 
            INTO v_completed_challenges FROM updated_gems WHERE is_completed = true;
        EXCEPTION WHEN OTHERS THEN END;
    END IF;

    -- 7. Check for badges
    BEGIN
        FOR v_badge IN SELECT * FROM public.check_and_award_badges(v_user_id) LOOP
            v_new_badges := v_new_badges || jsonb_build_object(
                'id', v_badge.badge_id,
                'name', v_badge.name,
                'icon_path', v_badge.icon_path
            );
        END LOOP;
    EXCEPTION WHEN OTHERS THEN END;

    RETURN jsonb_build_object(
        'success', true,
        'xp_gain', v_xp_gain,
        'gem_gain', v_gem_gain,
        'multiplier', v_multiplier,
        'new_xp', v_new_xp,
        'new_gems', v_new_gems,
        'new_proficiency', v_new_proficiency,
        'newBadges', COALESCE(v_new_badges, '[]'::jsonb),
        'completedChallenges', COALESCE(v_completed_challenges, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix Quizzes RLS and Grants (Force Apply)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.quizzes TO authenticated;
GRANT SELECT ON TABLE public.quizzes TO anon;

DROP POLICY IF EXISTS "Users can read own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can read public quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can read public quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can delete own quizzes" ON public.quizzes;

CREATE POLICY "Users can read own quizzes" ON public.quizzes FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Anyone can read public quizzes" ON public.quizzes FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own quizzes" ON public.quizzes FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = creator_id);

-- 6. Fix Quiz Submissions RLS
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.quiz_submissions TO authenticated;

DROP POLICY IF EXISTS "Users can read own attempts" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Users can read own submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Users can create own submissions" ON public.quiz_submissions;

CREATE POLICY "Users can read own submissions" ON public.quiz_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own submissions" ON public.quiz_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Fix Quiz Questions RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.quiz_questions TO authenticated;
GRANT SELECT ON TABLE public.quiz_questions TO anon;

DROP POLICY IF EXISTS "Users can manage questions for own quizzes" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can read questions for public quizzes" ON public.quiz_questions;

CREATE POLICY "Users can manage questions for own quizzes" ON public.quiz_questions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_questions.quiz_id AND creator_id = auth.uid())
);
CREATE POLICY "Users can read questions for public quizzes" ON public.quiz_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_questions.quiz_id AND is_public = true)
);

-- 8. Repair 'get_public_profile' (Missing function)
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_viewer_id uuid := auth.uid();
    v_profile record;
    v_followers_count int;
    v_following_count int;
    v_is_following boolean := false;
    v_user_badges jsonb;
    v_activity jsonb;
    v_proficiency_history jsonb;
BEGIN
    -- 1. Get basic profile info
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- 2. Get follower/following counts
    SELECT count(*) INTO v_followers_count FROM public.friendship WHERE following_id = p_user_id;
    SELECT count(*) INTO v_following_count FROM public.friendship WHERE follower_id = p_user_id;

    -- 3. Check if viewer is following
    IF v_viewer_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.friendship 
            WHERE follower_id = v_viewer_id AND following_id = p_user_id
        ) INTO v_is_following;
    END IF;

    -- 4. Get badges
    SELECT jsonb_agg(jsonb_build_object(
        'id', ub.id,
        'badge', jsonb_build_object(
            'name', b.name,
            'description', b.description,
            'iconPath', b.icon_path
        )
    )) INTO v_user_badges
    FROM public.user_badges ub
    JOIN public.badges b ON ub.badge_id = b.id
    WHERE ub.user_id = p_user_id;

    -- 5. Calculate Activity (last 7 days)
    WITH days AS (
        SELECT generate_series(now() - interval '6 days', now(), interval '1 day')::date AS d
    ),
    counts AS (
        SELECT created_at::date as d, count(*) as c
        FROM public.user_submissions
        WHERE user_id = p_user_id AND created_at > now() - interval '7 days'
        GROUP BY 1
    )
    SELECT jsonb_agg(jsonb_build_object('date', days.d::text, 'count', COALESCE(counts.c, 0)))
    INTO v_activity
    FROM days
    LEFT JOIN counts ON counts.d = days.d;

    -- 6. Proficiency History (from submissions)
    WITH history AS (
        SELECT created_at::date as d, avg(mastery_after) as v
        FROM public.user_submissions
        WHERE user_id = p_user_id
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 7
    )
    SELECT jsonb_agg(jsonb_build_object('date', d::text, 'value', round(v::numeric, 2)))
    INTO v_proficiency_history
    FROM (SELECT * FROM history ORDER BY d ASC) t;

    -- 7. Return combined object
    RETURN jsonb_build_object(
        'id', v_profile.id,
        'username', v_profile.username,
        'avatarConfig', v_profile.avatar_config,
        'createdAt', v_profile.created_at,
        'currentStreak', v_profile.current_streak,
        'xp', v_profile.xp,
        'followersCount', v_followers_count,
        'followingCount', v_following_count,
        'isFollowing', v_is_following,
        'userBadges', COALESCE(v_user_badges, '[]'::jsonb),
        'stats', jsonb_build_object(
            'activity', COALESCE(v_activity, '[]'::jsonb),
            'proficiencyHistory', COALESCE(v_proficiency_history, '[]'::jsonb)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 9. Repair 'get_mistake_recovery_question' (Ensuring qType compatibility)
CREATE OR REPLACE FUNCTION public.get_mistake_recovery_question()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_submission record;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    SELECT s.id, row_to_json(q.*) as question
    INTO v_submission
    FROM public.user_submissions s
    JOIN public.questions q ON q.id = s.question_id
    WHERE s.user_id = v_user_id 
      AND s.is_correct = false 
      AND (s.is_resolved IS NULL OR s.is_resolved = false)
    ORDER BY s.created_at ASC
    LIMIT 1;

    IF v_submission.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Inject qType for frontend compatibility
    RETURN jsonb_build_object(
        'id', v_submission.id,
        'question', v_submission.question::jsonb || jsonb_build_object('qType', v_submission.question->>'q_type')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 10. Repair 'shared_snippets' RLS and Grants
ALTER TABLE public.shared_snippets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.shared_snippets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.shared_snippets TO anon;

DROP POLICY IF EXISTS "Anyone can read snippets" ON public.shared_snippets;
DROP POLICY IF EXISTS "Users can create snippets" ON public.shared_snippets;
DROP POLICY IF EXISTS "Users can update own/editable snippets" ON public.shared_snippets;
DROP POLICY IF EXISTS "Users can update own snippets" ON public.shared_snippets;
DROP POLICY IF EXISTS "Users can delete own snippets" ON public.shared_snippets;

CREATE POLICY "Anyone can read snippets" ON public.shared_snippets FOR SELECT USING (true);
CREATE POLICY "Users can create snippets" ON public.shared_snippets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own/editable snippets" ON public.shared_snippets FOR UPDATE USING (
    (creator_id = auth.uid()) OR (is_editable = true) OR (creator_id IS NULL)
);
CREATE POLICY "Users can delete own snippets" ON public.shared_snippets FOR DELETE USING (creator_id = auth.uid());

-- 11. Final Grants for RPCs
GRANT EXECUTE ON FUNCTION complete_quiz_attempt(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_submission(uuid, boolean, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION sync_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mistake_recovery_question() TO authenticated;
