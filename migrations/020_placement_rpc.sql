-- ====================================================================
-- PHASE 4: PLACEMENT RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_placement_questions(p_language_id uuid)
RETURNS SETOF public.questions AS $$
BEGIN
    -- Simplified placement logic: 3 easy, 4 medium, 3 hard non-coding questions
    RETURN QUERY
    (SELECT * FROM public.questions WHERE language_id = p_language_id AND q_type != 'coding' AND difficulty_beta < -1.0 ORDER BY random() LIMIT 3)
    UNION ALL
    (SELECT * FROM public.questions WHERE language_id = p_language_id AND q_type != 'coding' AND difficulty_beta BETWEEN -1.0 AND 1.0 ORDER BY random() LIMIT 4)
    UNION ALL
    (SELECT * FROM public.questions WHERE language_id = p_language_id AND q_type != 'coding' AND difficulty_beta > 1.0 ORDER BY random() LIMIT 3);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.complete_placement(p_proficiency float)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    UPDATE public.profiles 
    SET has_completed_placement = true,
        global_proficiency = p_proficiency
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;