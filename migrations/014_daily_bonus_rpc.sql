-- ====================================================================
-- PHASE 2/4: DAILY BONUS RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_today text := to_char(now(), 'YYYY-MM-DD');
    v_yesterday text := to_char(now() - interval '1 day', 'YYYY-MM-DD');
    v_profile record;
    v_xp_bonus int := 50;
    v_gem_bonus int := 5;
    v_message text := 'Napi bónusz bezsebelve!';
    v_quote record;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Get profile or error if not found
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    IF v_profile.last_daily_bonus = v_today THEN
        RETURN jsonb_build_object('claimed', false, 'message', 'Mára már megkaptad');
    END IF;

    -- Update Streak
    IF v_profile.last_daily_bonus = v_yesterday THEN
        v_profile.current_streak := v_profile.current_streak + 1;
    ELSE
        v_profile.current_streak := 1;
    END IF;

    -- 5-day Streak Bonus
    IF v_profile.current_streak > 0 AND v_profile.current_streak % 5 = 0 THEN
        v_xp_bonus := v_xp_bonus + 100;
        v_gem_bonus := v_gem_bonus + 10;
        v_message := '🔥 ' || v_profile.current_streak || ' napos streak! Extra jutalom: +100 XP, +10 Gem!';
    END IF;

    -- Get random quote
    SELECT * INTO v_quote FROM public.quotes ORDER BY random() LIMIT 1;

    -- Update Profile
    UPDATE public.profiles 
    SET xp = xp + v_xp_bonus,
        gems = gems + v_gem_bonus,
        sanity_points = LEAST(100, sanity_points + 20),
        current_streak = v_profile.current_streak,
        last_daily_bonus = v_today,
        last_quote_id = v_quote.id
    WHERE id = v_user_id;

    -- Update Challenges (Streak)
    UPDATE public.user_challenges 
    SET current_value = v_profile.current_streak,
        is_completed = (v_profile.current_streak >= goal_value)
    WHERE user_id = v_user_id 
      AND action_type = 'STREAK' 
      AND is_completed = false 
      AND expires_at > now();

    RETURN jsonb_build_object(
        'claimed', true, 
        'bonus', v_xp_bonus, 
        'message', v_message, 
        'quote', jsonb_build_object('id', v_quote.id, 'text', v_quote.text, 'author', v_quote.author)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;