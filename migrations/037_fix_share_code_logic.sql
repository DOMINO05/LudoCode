
-- 37. Fix share code uniqueness check across Quizzes and Snippets
-- Fixes ambiguity and outdated table reference

DROP FUNCTION IF EXISTS public.is_share_code_taken(varchar);

CREATE OR REPLACE FUNCTION public.is_share_code_taken(p_code varchar)
RETURNS boolean AS $$
BEGIN
  -- Check in quizzes table (renamed from custom_quizzes in 032)
  PERFORM 1 FROM public.quizzes WHERE share_code = p_code;
  IF FOUND THEN RETURN true; END IF;
  
  -- Check in shared_snippets table
  PERFORM 1 FROM public.shared_snippets WHERE share_code = p_code;
  IF FOUND THEN RETURN true; END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Update the triggers to use the new parameter name
CREATE OR REPLACE FUNCTION public.set_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    LOOP
      NEW.share_code := generate_share_code();
      IF NOT is_share_code_taken(NEW.share_code) THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_snippet_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    LOOP
      NEW.share_code := generate_share_code();
      IF NOT is_share_code_taken(NEW.share_code) THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
