-- ====================================================================
-- PHASE 4: ADAPTIVE QUESTION SELECTION RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_next_adaptive_question(
    p_language_id uuid,
    p_type text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_user_theta float;
    v_target_concept_id uuid;
    v_question record;
    v_excluded_ids uuid[];
    v_range float;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Get user ability (Theta)
    SELECT global_proficiency INTO v_user_theta FROM public.profiles WHERE id = v_user_id;

    -- 2. Get recently answered questions to exclude (last 12)
    SELECT ARRAY(
        SELECT question_id 
        FROM public.user_submissions 
        WHERE user_id = v_user_id AND question_id IS NOT NULL 
        ORDER BY created_at DESC 
        LIMIT 12
    ) INTO v_excluded_ids;

    -- 3. If no type specified, recommend a concept
    IF p_type IS NULL THEN
        WITH learnable_concepts AS (
            SELECT c.id
            FROM public.concepts c
            LEFT JOIN public.user_concept_mastery m ON m.concept_id = c.id AND m.user_id = v_user_id
            WHERE (m.mastery_probability IS NULL OR m.mastery_probability < 0.95)
              AND NOT EXISTS (
                  -- Check prerequisites
                  SELECT 1 FROM public.concept_prerequisites cp
                  JOIN public.concepts p ON p.id = cp.prerequisite_id
                  LEFT JOIN public.user_concept_mastery pm ON pm.concept_id = p.id AND pm.user_id = v_user_id
                  WHERE cp.concept_id = c.id 
                    AND (pm.mastery_probability IS NULL OR pm.mastery_probability < 0.7)
              )
        )
        SELECT id INTO v_target_concept_id FROM learnable_concepts ORDER BY random() LIMIT 1;
    END IF;

    -- 4. Find adaptive question
    -- Strategy: Try progressive ranges for Beta around Theta
    FOREACH v_range IN ARRAY ARRAY[0.5, 1.0, 3.0, 10.0] LOOP
        SELECT q.* INTO v_question
        FROM public.questions q
        LEFT JOIN public.question_concepts qc ON qc.question_id = q.id
        WHERE q.language_id = p_language_id
          AND q.difficulty_beta BETWEEN (v_user_theta - v_range) AND (v_user_theta + v_range)
          AND (p_type IS NULL OR q.q_type::text = p_type)
          AND (v_target_concept_id IS NULL OR qc.concept_id = v_target_concept_id)
          AND NOT (q.id = ANY(v_excluded_ids))
        ORDER BY random()
        LIMIT 1;

        EXIT WHEN v_question.id IS NOT NULL;
    END LOOP;

    -- 5. Fallback: If no question found for concept, try without concept filter
    IF v_question.id IS NULL AND v_target_concept_id IS NOT NULL THEN
        FOREACH v_range IN ARRAY ARRAY[1.0, 3.0, 10.0] LOOP
            SELECT q.* INTO v_question
            FROM public.questions q
            WHERE q.language_id = p_language_id
              AND q.difficulty_beta BETWEEN (v_user_theta - v_range) AND (v_user_theta + v_range)
              AND (p_type IS NULL OR q.q_type::text = p_type)
              AND NOT (q.id = ANY(v_excluded_ids))
            ORDER BY random()
            LIMIT 1;

            EXIT WHEN v_question.id IS NOT NULL;
        END LOOP;
    END IF;

    IF v_question.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_question)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;