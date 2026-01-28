-- 45. Temporary helper to clean up test users by username
CREATE OR REPLACE FUNCTION public.debug_delete_user_by_name(p_username text)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM public.profiles WHERE username = p_username;
    
    IF v_user_id IS NOT NULL THEN
        DELETE FROM public.user_challenges WHERE user_id = v_user_id;
        DELETE FROM public.user_submissions WHERE user_id = v_user_id;
        DELETE FROM public.user_inventory WHERE user_id = v_user_id;
        DELETE FROM public.user_badges WHERE user_id = v_user_id;
        DELETE FROM public.quizzes WHERE creator_id = v_user_id;
        DELETE FROM public.friendship WHERE follower_id = v_user_id OR following_id = v_user_id;
        DELETE FROM public.profiles WHERE id = v_user_id;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to anon for this temporary cleanup
GRANT EXECUTE ON FUNCTION public.debug_delete_user_by_name(text) TO anon;
GRANT EXECUTE ON FUNCTION public.debug_delete_user_by_name(text) TO authenticated;
