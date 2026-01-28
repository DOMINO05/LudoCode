-- 42. Fix get_public_profile RPC column reference error
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

    -- 4. Get badges (Fixed column references)
    SELECT jsonb_agg(jsonb_build_object(
        'id', b.id,
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
