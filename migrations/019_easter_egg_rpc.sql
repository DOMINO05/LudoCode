-- ====================================================================
-- PHASE 4: EASTER EGG RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.check_easter_egg(p_code text)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    IF lower(p_code) IN ('ludo', 'konami') THEN
        UPDATE public.profiles 
        SET gems = gems + 50
        WHERE id = v_user_id;
        
        RETURN jsonb_build_object('success', true, 'message', 'Cheat Code Activated: 50 Gems added!');
    END IF;

    RETURN jsonb_build_object('success', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;