-- ====================================================================
-- PHASE 14: UPDATE SHARE CODE UNIQUENESS CHECK
-- Align with renamed 'quizzes' table
-- ====================================================================

CREATE OR REPLACE FUNCTION is_share_code_taken(code varchar)
RETURNS boolean AS $$
BEGIN
  -- Check quizzes table (renamed from custom_quizzes)
  PERFORM 1 FROM public.quizzes WHERE share_code = code;
  IF FOUND THEN RETURN true; END IF;
  
  -- Check shared_snippets table
  PERFORM 1 FROM public.shared_snippets WHERE share_code = code;
  IF FOUND THEN RETURN true; END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;
