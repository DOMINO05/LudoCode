-- Fix get_active_challenges to include weekly challenges and return period
-- Fix ambiguous column references by using explicit aliases and unique return column names
DROP FUNCTION IF EXISTS public.get_active_challenges();
CREATE OR REPLACE FUNCTION public.get_active_challenges()
RETURNS TABLE (
    out_id uuid,
    out_user_id uuid,
    out_template_id uuid,
    out_action_type public.challenge_action,
    out_goal_value int,
    out_current_value int,
    out_reward_xp int,
    out_reward_gems int,
    out_description text,
    out_is_completed boolean,
    out_is_claimed boolean,
    out_created_at timestamptz,
    out_expires_at timestamptz,
    out_period public.challenge_period
) AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_now timestamptz := now();
    v_start_of_day timestamptz := date_trunc('day', v_now);
    v_start_of_week timestamptz := date_trunc('week', v_now);
    v_day_index int := extract(epoch from v_start_of_day)::int / (60*60*24);
    v_week_index int := extract(epoch from v_start_of_week)::int / (60*60*24*7);
    v_exists_daily int;
    v_exists_weekly int;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 1. Ensure Daily Challenges (3 per day)
    SELECT count(*) INTO v_exists_daily FROM public.user_challenges uc
    WHERE uc.user_id = v_user_id 
      AND uc.expires_at > v_now 
      AND uc.template_id IN (SELECT t.id FROM public.challenge_templates t WHERE t.period = 'DAILY');

    IF v_exists_daily = 0 THEN
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

    -- 2. Ensure Weekly Challenges (2 per week)
    SELECT count(*) INTO v_exists_weekly FROM public.user_challenges uc
    WHERE uc.user_id = v_user_id 
      AND uc.expires_at > v_now 
      AND uc.template_id IN (SELECT t.id FROM public.challenge_templates t WHERE t.period = 'WEEKLY');

    IF v_exists_weekly = 0 THEN
        INSERT INTO public.user_challenges (user_id, template_id, action_type, goal_value, reward_xp, reward_gems, description, expires_at)
        SELECT v_user_id, t.id, t.action_type, t.goal_value, t.reward_xp, t.reward_gems, 
               replace(t.description_template, '{goal}', t.goal_value::text),
               v_start_of_week + interval '1 week'
        FROM (
            SELECT *, row_number() OVER (ORDER BY id) as rn
            FROM public.challenge_templates
            WHERE period = 'WEEKLY'
        ) t
        WHERE t.rn IN (
            1 + (v_week_index * 2) % (SELECT count(*)::int FROM public.challenge_templates WHERE period = 'WEEKLY'),
            1 + (v_week_index * 2 + 1) % (SELECT count(*)::int FROM public.challenge_templates WHERE period = 'WEEKLY')
        );
    END IF;

    RETURN QUERY 
    SELECT 
        uc.id, uc.user_id, uc.template_id, uc.action_type, uc.goal_value, 
        uc.current_value, uc.reward_xp, uc.reward_gems, uc.description, 
        uc.is_completed, uc.is_claimed, uc.created_at, uc.expires_at,
        ct.period
    FROM public.user_challenges uc
    LEFT JOIN public.challenge_templates ct ON uc.template_id = ct.id
    WHERE uc.user_id = v_user_id AND uc.expires_at > v_now
    ORDER BY uc.is_completed ASC, uc.is_claimed ASC, uc.expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
