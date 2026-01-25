-- ====================================================================
-- PHASE 4: CHALLENGES RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_active_challenges()
RETURNS SETOF public.user_challenges AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_now timestamptz := now();
    v_start_of_day timestamptz := date_trunc('day', v_now);
    v_start_of_week timestamptz := date_trunc('week', v_now);
    v_day_index int := extract(epoch from v_start_of_day)::int / (60*60*24);
    v_week_index int := extract(epoch from v_start_of_week)::int / (60*60*24*7);
    v_exists int;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Ensure Daily Challenges
    SELECT count(*) INTO v_exists FROM public.user_challenges 
    WHERE user_id = v_user_id AND expires_at > v_now AND action_type != 'STREAK'; -- Simple filter for daily

    IF v_exists = 0 THEN
        INSERT INTO public.user_challenges (user_id, template_id, action_type, goal_value, reward_xp, reward_gems, description, expires_at)
        SELECT v_user_id, t.id, t.action_type, t.goal_value, t.reward_xp, t.reward_gems, 
               replace(t.description_template, '{goal}', t.goal_value::text),
               v_start_of_day + interval '1 day'
        FROM (
            SELECT *, row_number() OVER (ORDER BY id) as rn
            FROM public.challenge_templates
            WHERE period = 'DAILY'
        ) t
        WHERE t.rn IN (
            1 + (v_day_index * 3) % (SELECT count(*)::int FROM public.challenge_templates WHERE period = 'DAILY'),
            1 + (v_day_index * 3 + 1) % (SELECT count(*)::int FROM public.challenge_templates WHERE period = 'DAILY'),
            1 + (v_day_index * 3 + 2) % (SELECT count(*)::int FROM public.challenge_templates WHERE period = 'DAILY')
        );
    END IF;

    -- 2. Ensure Weekly Challenges (similar logic)
    -- ... skipping for now to keep it simple or implement similarly

    RETURN QUERY SELECT * FROM public.user_challenges 
    WHERE user_id = v_user_id AND expires_at > v_now
    ORDER BY is_completed ASC, is_claimed ASC, expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;