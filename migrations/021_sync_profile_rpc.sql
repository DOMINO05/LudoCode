-- ====================================================================
-- PHASE 4: PROFILE SYNC RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.sync_profile(
    p_level text DEFAULT 'Beginner',
    p_username text DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_profile public.profiles;
    v_initial_proficiency float := 0.0;
    v_avatar_options jsonb := '{
        "skinColor": ["ffe4c0", "f5d0a9", "e8b88d", "d49d7b", "b67b5e", "8d5441", "5d3428"],
        "hairColor": ["000000", "4a4a4a", "ffffff", "b8b8b8", "8d2a2a", "c54b29", "e2ba4f", "6a4e23", "3b6e85"],
        "backgroundColor": ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "ffffff", "65c9ff", "58cc02", "1a1a1a", "transparent"],
        "hair": ["short01", "short02", "short03", "short04", "short05", "short06", "short07", "short08", "long01", "long02"],
        "eyes": ["variant01", "variant02", "variant03", "variant04"],
        "mouth": ["happy01", "happy02", "happy03", "happy04"]
    }'::jsonb;
    v_random_avatar jsonb;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Check for existing profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

    IF v_profile.id IS NOT NULL THEN
        -- Update if needed
        IF p_username IS NOT NULL AND (v_profile.username IS NULL OR v_profile.username = '') THEN
            UPDATE public.profiles SET username = p_username WHERE id = v_user_id RETURNING * INTO v_profile;
        END IF;
        RETURN v_profile;
    END IF;

    -- Set initial proficiency
    IF p_level = 'Beginner' THEN v_initial_proficiency := -2.0;
    ELSIF p_level = 'Intermediate' THEN v_initial_proficiency := 0.0;
    ELSIF p_level = 'Pro' THEN v_initial_proficiency := 2.0;
    END IF;

    -- Generate random avatar (simplified)
    v_random_avatar := jsonb_build_object(
        'skinColor', (v_avatar_options->'skinColor')->>(floor(random() * 7)::int),
        'hairColor', (v_avatar_options->'hairColor')->>(floor(random() * 9)::int),
        'backgroundColor', (v_avatar_options->'backgroundColor')->>(floor(random() * 10)::int),
        'hair', (v_avatar_options->'hair')->>(floor(random() * 10)::int),
        'eyes', (v_avatar_options->'eyes')->>(floor(random() * 4)::int),
        'mouth', (v_avatar_options->'mouth')->>(floor(random() * 4)::int),
        'clothing', 'variant01',
        'seed', v_user_id::text
    );

    -- Create new profile
    INSERT INTO public.profiles (
        id, username, global_proficiency, has_completed_placement, sanity_points, gems, xp, current_streak, avatar_config
    ) VALUES (
        v_user_id, p_username, v_initial_proficiency, false, 100, 0, 0, 0, v_random_avatar
    ) RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;