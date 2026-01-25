-- ====================================================================
-- PHASE 4: MISTAKE RECOVERY RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_oldest_unresolved_mistake()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_submission record;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    SELECT s.*, row_to_json(q.*) as question
    FROM public.user_submissions s
    JOIN public.questions q ON q.id = s.question_id
    WHERE s.user_id = v_user_id 
      AND s.is_correct = false 
      AND s.is_resolved = false
    ORDER BY s.created_at ASC
    LIMIT 1 INTO v_submission;

    IF v_submission.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_submission)::jsonb;
END;
$$ LANGUAGE plpgsql STABLE;