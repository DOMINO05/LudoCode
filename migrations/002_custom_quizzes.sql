-- ====================================================================
-- CUSTOM QUIZZES MIGRATION
-- Adds support for user-created quizzes
-- ====================================================================

-- 1. Add creator_id to questions table (for user-created questions)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Create custom_quizzes table
CREATE TABLE IF NOT EXISTS public.custom_quizzes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_public boolean DEFAULT false,
  share_code varchar(6) UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create quiz_questions junction table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  quiz_id uuid NOT NULL REFERENCES public.custom_quizzes(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index int NOT NULL,
  PRIMARY KEY (quiz_id, question_id)
);

-- 4. Create user_quiz_attempts table
DROP TABLE IF EXISTS public.user_quiz_attempts CASCADE;
CREATE TABLE IF NOT EXISTS public.user_quiz_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id uuid NOT NULL REFERENCES public.custom_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score int NOT NULL,
  max_score int NOT NULL,
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_quizzes_creator ON public.custom_quizzes(creator_id);
CREATE INDEX IF NOT EXISTS idx_custom_quizzes_public ON public.custom_quizzes(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_custom_quizzes_share_code ON public.custom_quizzes(share_code) WHERE share_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.user_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_creator ON public.questions(creator_id) WHERE creator_id IS NOT NULL;

-- 6. Enable RLS
ALTER TABLE public.custom_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for custom_quizzes
-- Users can read their own quizzes
CREATE POLICY "Users can read own quizzes" 
  ON public.custom_quizzes FOR SELECT 
  USING (auth.uid() = creator_id);

-- Users can read public quizzes
CREATE POLICY "Anyone can read public quizzes" 
  ON public.custom_quizzes FOR SELECT 
  USING (is_public = true);

-- Users can insert their own quizzes
CREATE POLICY "Users can create own quizzes" 
  ON public.custom_quizzes FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own quizzes
CREATE POLICY "Users can update own quizzes" 
  ON public.custom_quizzes FOR UPDATE 
  USING (auth.uid() = creator_id);

-- Users can delete their own quizzes
CREATE POLICY "Users can delete own quizzes" 
  ON public.custom_quizzes FOR DELETE 
  USING (auth.uid() = creator_id);

-- 8. RLS Policies for quiz_questions
-- Users can read questions from quizzes they own or public quizzes
CREATE POLICY "Users can read quiz questions" 
  ON public.quiz_questions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_quizzes 
      WHERE id = quiz_id 
      AND (creator_id = auth.uid() OR is_public = true)
    )
  );

-- Users can manage questions in their own quizzes
CREATE POLICY "Users can manage own quiz questions" 
  ON public.quiz_questions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_quizzes 
      WHERE id = quiz_id AND creator_id = auth.uid()
    )
  );

-- 9. RLS Policies for user_quiz_attempts
-- Users can read their own attempts
CREATE POLICY "Users can read own attempts" 
  ON public.user_quiz_attempts FOR SELECT 
  USING (auth.uid() = user_id);

-- Quiz creators can read all attempts on their quizzes
CREATE POLICY "Creators can read quiz attempts" 
  ON public.user_quiz_attempts FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_quizzes 
      WHERE id = quiz_id AND creator_id = auth.uid()
    )
  );

-- Users can insert their own attempts
CREATE POLICY "Users can create own attempts" 
  ON public.user_quiz_attempts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own attempts
CREATE POLICY "Users can update own attempts" 
  ON public.user_quiz_attempts FOR UPDATE 
  USING (auth.uid() = user_id);

-- 10. Function to generate unique share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS varchar(6) AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result varchar(6) := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger to auto-generate share code on insert
CREATE OR REPLACE FUNCTION set_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    LOOP
      NEW.share_code := generate_share_code();
      BEGIN
        -- Check if code is unique
        PERFORM 1 FROM public.custom_quizzes WHERE share_code = NEW.share_code;
        IF NOT FOUND THEN
          EXIT;
        END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_share_code
  BEFORE INSERT ON public.custom_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION set_share_code();
