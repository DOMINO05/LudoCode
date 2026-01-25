-- ====================================================================
-- PHASE 9: FIX SUBMISSION RPC (Language ID)
-- ====================================================================

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
        -- Get or create mastery record (Include language_id!)
        -- Note: If language_id column exists, we must provide it.
        -- We use a dynamic approach or just assume it exists based on the error.
        
        -- Try Insert with language_id
        BEGIN
            INSERT INTO public.user_concept_mastery (user_id, concept_id, mastery_probability, language_id)
            VALUES (v_user_id, v_record.concept_id, v_record.p_init, v_lang_id)
            ON CONFLICT (user_id, concept_id) DO NOTHING;
        EXCEPTION WHEN undefined_column THEN
            -- Fallback if language_id column doesn't exist (though error says it does)
            INSERT INTO public.user_concept_mastery (user_id, concept_id, mastery_probability)
            VALUES (v_user_id, v_record.concept_id, v_record.p_init)
            ON CONFLICT (user_id, concept_id) DO NOTHING;
        END;

        SELECT mastery_probability INTO v_p_prev 
        FROM public.user_concept_mastery 
        WHERE user_id = v_user_id AND concept_id = v_record.concept_id;

        v_mastery_before := v_mastery_before + v_p_prev;
        v_concept_count := v_concept_count + 1;

        -- Bayes Update
        IF p_is_correct THEN
            v_p_evidence := (v_p_prev * (1 - v_record.p_slip)) / (v_p_prev * (1 - v_record.p_slip) + (1 - v_p_prev) * v_record.p_guess);
        ELSE
            v_p_evidence := (v_p_prev * v_record.p_slip) / (v_p_prev * v_record.p_slip + (1 - v_p_prev) * (1 - v_record.p_guess));
        END IF;

        -- Transition
        v_p_new := v_p_evidence + (1 - v_p_evidence) * v_record.p_transit;
        
        -- Weight application
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

    -- 4. Update Profile & Language Progress
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

    -- 6. Update Challenges (Incremental)
    BEGIN
        IF p_is_correct THEN
            -- Solve Question challenge
            UPDATE public.user_challenges 
            SET current_value = LEAST(goal_value, current_value + 1),
                is_completed = (current_value + 1 >= goal_value)
            WHERE user_id = v_user_id 
              AND action_type = 'SOLVE_QUESTION' 
              AND is_completed = false 
              AND expires_at > now();

            -- Earn Gems challenge
            UPDATE public.user_challenges 
            SET current_value = LEAST(goal_value, current_value + v_gem_gain),
                is_completed = (current_value + v_gem_gain >= goal_value)
            WHERE user_id = v_user_id 
              AND action_type = 'EARN_GEMS' 
              AND is_completed = false 
              AND expires_at > now();
        END IF;
    EXCEPTION WHEN OTHERS THEN
    END;

    RETURN jsonb_build_object(
        'success', true,
        'xp_gain', v_xp_gain,
        'gem_gain', v_gem_gain,
        'multiplier', v_multiplier,
        'new_xp', v_new_xp,
        'new_gems', v_new_gems,
        'new_proficiency', v_new_proficiency
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_submission(uuid, boolean, text, int, int) TO authenticated;