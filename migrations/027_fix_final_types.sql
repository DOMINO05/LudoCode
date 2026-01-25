-- ====================================================================
-- PHASE 7: FINAL FIXES
-- ====================================================================

-- 1. Fix Daily Bonus Date Types (UPDATE statement issue)
CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_today date := CURRENT_DATE;
    v_yesterday date := CURRENT_DATE - 1;
    v_profile record;
    v_xp_bonus int := 50;
    v_gem_bonus int := 5;
    v_message text := 'Napi bónusz bezsebelve!';
    v_quote record;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- Compare dates directly (Postgres handles date comparison well)
    IF v_profile.last_daily_bonus IS NOT NULL AND v_profile.last_daily_bonus = v_today THEN
        RETURN jsonb_build_object('claimed', false, 'message', 'Mára már megkaptad');
    END IF;

    -- Update Streak
    IF v_profile.last_daily_bonus IS NOT NULL AND v_profile.last_daily_bonus = v_yesterday THEN
        v_profile.current_streak := v_profile.current_streak + 1;
    ELSE
        v_profile.current_streak := 1;
    END IF;

    IF v_profile.current_streak > 0 AND v_profile.current_streak % 5 = 0 THEN
        v_xp_bonus := v_xp_bonus + 100;
        v_gem_bonus := v_gem_bonus + 10;
        v_message := '🔥 ' || v_profile.current_streak || ' napos streak! Extra jutalom: +100 XP, +10 Gem!';
    END IF;

    SELECT * INTO v_quote FROM public.quotes ORDER BY random() LIMIT 1;

    UPDATE public.profiles 
    SET xp = xp + v_xp_bonus,
        gems = gems + v_gem_bonus,
        sanity_points = LEAST(100, sanity_points + 20),
        current_streak = v_profile.current_streak,
        last_daily_bonus = v_today,  -- Now assigning DATE to DATE column
        last_quote_id = v_quote.id
    WHERE id = v_user_id;

    BEGIN
        UPDATE public.user_challenges 
        SET current_value = v_profile.current_streak,
            is_completed = (v_profile.current_streak >= goal_value)
        WHERE user_id = v_user_id 
          AND action_type = 'STREAK' 
          AND is_completed = false 
          AND expires_at > now();
    EXCEPTION WHEN OTHERS THEN
    END;

    RETURN jsonb_build_object(
        'claimed', true, 
        'bonus', v_xp_bonus, 
        'message', v_message, 
        'quote', CASE WHEN v_quote IS NOT NULL THEN jsonb_build_object('id', v_quote.id, 'text', v_quote.text, 'author', v_quote.author) ELSE null END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Missing Constraint for ON CONFLICT
-- user_concept_mastery needs a unique constraint on (user_id, concept_id)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_concept_mastery_pkey' OR conname = 'user_concept_mastery_user_id_concept_id_key'
    ) THEN
        -- If Primary Key is missing, try to add it (might fail if duplicates exist)
        -- First clean up duplicates if any
        DELETE FROM public.user_concept_mastery a USING public.user_concept_mastery b
        WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.concept_id = b.concept_id;
        
        ALTER TABLE public.user_concept_mastery 
        ADD CONSTRAINT user_concept_mastery_pkey PRIMARY KEY (user_id, concept_id);
    END IF;
END $$;

GRANT EXECUTE ON FUNCTION claim_daily_bonus() TO authenticated;