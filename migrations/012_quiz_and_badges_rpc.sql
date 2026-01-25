-- ====================================================================
-- PHASE 2 EXTENSION: QUIZZES AND BADGES RPC
-- ====================================================================

-- 1. Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS TABLE (
    badge_id uuid,
    name text,
    icon_path text
) AS $$
DECLARE
    v_badge record;
    v_qualified boolean;
    v_xp int;
    v_gems int;
    v_streak int;
    v_proficiency float;
    v_submission_count int;
BEGIN
    -- Get user stats
    SELECT xp, gems, current_streak, global_proficiency 
    INTO v_xp, v_gems, v_streak, v_proficiency
    FROM public.profiles WHERE id = p_user_id;

    SELECT count(*) INTO v_submission_count 
    FROM public.user_submissions WHERE user_id = p_user_id AND is_correct = true;

    FOR v_badge IN SELECT * FROM public.badges LOOP
        -- Skip if already awarded
        CONTINUE WHEN EXISTS (
            SELECT 1 FROM public.user_badges 
            WHERE user_id = p_user_id AND badge_id = v_badge.id
        );

        v_qualified := false;
        CASE v_badge.criteria_type
            WHEN 'XP' THEN v_qualified := v_xp >= v_badge.criteria_value;
            WHEN 'GEMS' THEN v_qualified := v_gems >= v_badge.criteria_value;
            WHEN 'STREAK' THEN v_qualified := v_streak >= v_badge.criteria_value;
            WHEN 'PROFICIENCY' THEN v_qualified := v_proficiency >= v_badge.criteria_value;
            WHEN 'SUBMISSIONS' THEN v_qualified := v_submission_count >= v_badge.criteria_value;
            ELSE v_qualified := false;
        END CASE;

        IF v_qualified THEN
            INSERT INTO public.user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id);
            
            badge_id := v_badge.id;
            name := v_badge.name;
            icon_path := v_badge.icon_path;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to complete a quiz attempt
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

    -- 1. Record the attempt
    INSERT INTO public.user_quiz_attempts (quiz_id, user_id, score, max_score, completed_at)
    VALUES (p_quiz_id, v_user_id, p_score, p_max_score, now());

    -- 2. Award XP/Gems for participation
    v_xp_gain := 30; -- Base XP for finishing a quiz
    v_gem_gain := 2; -- Base Gems

    UPDATE public.profiles 
    SET xp = xp + v_xp_gain,
        gems = gems + v_gem_gain
    WHERE id = v_user_id;

    -- 3. Update challenges
    UPDATE public.user_challenges 
    SET current_value = LEAST(goal_value, current_value + 1),
        is_completed = (current_value + 1 >= goal_value)
    WHERE user_id = v_user_id 
      AND action_type = 'PLAY_QUIZ' 
      AND is_completed = false 
      AND expires_at > now();

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

-- 3. Update complete_submission and resolve_mistake to also return badges
-- (We'll update them in a follow-up or just include them here)
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
    v_challenge record;
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
        INSERT INTO public.user_concept_mastery (user_id, concept_id, mastery_probability)
        VALUES (v_user_id, v_record.concept_id, v_record.p_init)
        ON CONFLICT (user_id, concept_id) DO NOTHING;

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

    -- 6. Update Challenges and capture completed ones
    IF p_is_correct THEN
        WITH updated AS (
            UPDATE public.user_challenges 
            SET current_value = LEAST(goal_value, current_value + 1),
                is_completed = (current_value + 1 >= goal_value)
            WHERE user_id = v_user_id 
              AND action_type = 'SOLVE_QUESTION' 
              AND is_completed = false 
              AND expires_at > now()
            RETURNING id, description, is_completed
        )
        SELECT jsonb_agg(jsonb_build_object('id', id, 'description', description)) INTO v_completed_challenges FROM updated WHERE is_completed = true;

        WITH updated_gems AS (
            UPDATE public.user_challenges 
            SET current_value = LEAST(goal_value, current_value + v_gem_gain),
                is_completed = (current_value + v_gem_gain >= goal_value)
            WHERE user_id = v_user_id 
              AND action_type = 'EARN_GEMS' 
              AND is_completed = false 
              AND expires_at > now()
            RETURNING id, description, is_completed
        )
        SELECT v_completed_challenges || COALESCE(jsonb_agg(jsonb_build_object('id', id, 'description', description)), '[]'::jsonb) 
        INTO v_completed_challenges FROM updated_gems WHERE is_completed = true;
    END IF;

    -- 7. Check for badges
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
        'multiplier', v_multiplier,
        'new_xp', v_new_xp,
        'new_gems', v_new_gems,
        'new_proficiency', v_new_proficiency,
        'newBadges', v_new_badges,
        'completedChallenges', COALESCE(v_completed_challenges, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;