-- ====================================================================
-- PHASE 4: USER STATS RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_activity jsonb;
    v_proficiency_history jsonb;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Calculate Activity (last 7 days)
    WITH days AS (
        SELECT generate_series(now() - interval '6 days', now(), interval '1 day')::date AS d
    ),
    counts AS (
        SELECT created_at::date as d, count(*) as c
        FROM public.user_submissions
        WHERE user_id = v_user_id AND created_at > now() - interval '7 days'
        GROUP BY 1
    )
    SELECT jsonb_agg(jsonb_build_object('date', days.d::text, 'count', COALESCE(counts.c, 0)))
    INTO v_activity
    FROM days
    LEFT JOIN counts ON counts.d = days.d;

    -- 2. Proficiency History (Simplified approximation)
    -- Just return last 100 points or something similar
    -- In a real app, we'd store snapshots. For now, we take from submissions.
    WITH history AS (
        SELECT created_at::date as d, avg(mastery_after) as v
        FROM public.user_submissions
        WHERE user_id = v_user_id
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 7
    )
    SELECT jsonb_agg(jsonb_build_object('date', d::text, 'value', round(v::numeric, 2)))
    INTO v_proficiency_history
    FROM (SELECT * FROM history ORDER BY d ASC) t;

    RETURN jsonb_build_object(
        'activity', v_activity,
        'proficiencyHistory', v_proficiency_history
    );
END;
$$ LANGUAGE plpgsql STABLE;