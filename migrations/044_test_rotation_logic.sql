-- 44. Test function to simulate future challenges rotation
-- Updated to fix ambiguous column names and use TEXT
DROP FUNCTION IF EXISTS public.debug_simulate_challenges(int);
CREATE OR REPLACE FUNCTION public.debug_simulate_challenges(p_days_offset int)
RETURNS TABLE (
    out_period text,
    out_description_template text,
    out_rn_calculated int
) AS $$
DECLARE
    v_sim_now timestamptz := now() + (p_days_offset || ' days')::interval;
    v_sim_start_of_day timestamptz := date_trunc('day', v_sim_now);
    v_sim_start_of_week timestamptz := date_trunc('week', v_sim_now);
    v_day_index int := extract(epoch from v_sim_start_of_day)::int / (60*60*24);
    v_week_index int := extract(epoch from v_sim_start_of_week)::int / (60*60*24*7);
BEGIN
    -- Daily Simulation
    RETURN QUERY
    SELECT 'DAILY' as period, t.description_template, t.rn::int
    FROM (
        SELECT ct.description_template, row_number() OVER (ORDER BY ct.id) as rn
        FROM public.challenge_templates ct
        WHERE ct.period::text = 'DAILY'
    ) t
    WHERE t.rn IN (
        1 + (v_day_index * 3) % (SELECT count(*)::int FROM public.challenge_templates WHERE period::text = 'DAILY'),
        1 + (v_day_index * 3 + 1) % (SELECT count(*)::int FROM public.challenge_templates WHERE period::text = 'DAILY'),
        1 + (v_day_index * 3 + 2) % (SELECT count(*)::int FROM public.challenge_templates WHERE period::text = 'DAILY')
    )
    UNION ALL
    -- Weekly Simulation
    SELECT 'WEEKLY' as period, t.description_template, t.rn::int
    FROM (
        SELECT ct.description_template, row_number() OVER (ORDER BY ct.id) as rn
        FROM public.challenge_templates ct
        WHERE ct.period::text = 'WEEKLY'
    ) t
    WHERE t.rn IN (
        1 + (v_week_index * 2) % (SELECT count(*)::int FROM public.challenge_templates WHERE period::text = 'WEEKLY'),
        1 + (v_week_index * 2 + 1) % (SELECT count(*)::int FROM public.challenge_templates WHERE period::text = 'WEEKLY')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
