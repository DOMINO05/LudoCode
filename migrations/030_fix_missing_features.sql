-- ====================================================================
-- PHASE 10: FIX MISSING FEATURES (Challenges & Mistake Recovery)
-- ====================================================================

-- 1. Fix Challenges Table Structure (Handle camelCase vs snake_case mismatch)
DO $$ BEGIN
    -- If 'actionType' exists (from TypeORM), rename it to 'action_type' for consistency
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenge_templates' AND column_name = 'actionType') THEN
        ALTER TABLE public.challenge_templates RENAME COLUMN "actionType" TO action_type;
    END IF;
    
    -- If 'goalValue' exists, rename to 'goal_value'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenge_templates' AND column_name = 'goalValue') THEN
        ALTER TABLE public.challenge_templates RENAME COLUMN "goalValue" TO goal_value;
    END IF;

    -- If 'rewardXp' exists, rename to 'reward_xp'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenge_templates' AND column_name = 'rewardXp') THEN
        ALTER TABLE public.challenge_templates RENAME COLUMN "rewardXp" TO reward_xp;
    END IF;

    -- If 'rewardGems' exists, rename to 'reward_gems'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenge_templates' AND column_name = 'rewardGems') THEN
        ALTER TABLE public.challenge_templates RENAME COLUMN "rewardGems" TO reward_gems;
    END IF;
    
    -- If 'descriptionTemplate' exists, rename to 'description_template'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenge_templates' AND column_name = 'descriptionTemplate') THEN
        ALTER TABLE public.challenge_templates RENAME COLUMN "descriptionTemplate" TO description_template;
    END IF;
END $$;

-- Ensure columns exist (if table was empty or not fully created)
ALTER TABLE public.challenge_templates 
ADD COLUMN IF NOT EXISTS action_type text,
ADD COLUMN IF NOT EXISTS period text DEFAULT 'DAILY',
ADD COLUMN IF NOT EXISTS description_template text,
ADD COLUMN IF NOT EXISTS goal_value int DEFAULT 1,
ADD COLUMN IF NOT EXISTS reward_xp int DEFAULT 50,
ADD COLUMN IF NOT EXISTS reward_gems int DEFAULT 5;

-- 2. Seed Challenge Templates (Safe Insert)
INSERT INTO public.challenge_templates (action_type, period, description_template, goal_value, reward_xp, reward_gems)
SELECT 'SOLVE_QUESTION', 'DAILY', 'Oldj meg {goal} feladatot helyesen', 3, 50, 5
WHERE NOT EXISTS (SELECT 1 FROM public.challenge_templates WHERE action_type = 'SOLVE_QUESTION' AND period = 'DAILY');

INSERT INTO public.challenge_templates (action_type, period, description_template, goal_value, reward_xp, reward_gems)
SELECT 'EARN_GEMS', 'DAILY', 'Gyűjts {goal} drágakövet', 10, 30, 10
WHERE NOT EXISTS (SELECT 1 FROM public.challenge_templates WHERE action_type = 'EARN_GEMS' AND period = 'DAILY');

INSERT INTO public.challenge_templates (action_type, period, description_template, goal_value, reward_xp, reward_gems)
SELECT 'RESOLVE_MISTAKE', 'DAILY', 'Javíts ki {goal} korábbi hibát', 1, 100, 20
WHERE NOT EXISTS (SELECT 1 FROM public.challenge_templates WHERE action_type = 'RESOLVE_MISTAKE' AND period = 'DAILY');

INSERT INTO public.challenge_templates (action_type, period, description_template, goal_value, reward_xp, reward_gems)
SELECT 'STREAK', 'WEEKLY', 'Érj el {goal} napos sorozatot', 3, 200, 50
WHERE NOT EXISTS (SELECT 1 FROM public.challenge_templates WHERE action_type = 'STREAK' AND period = 'WEEKLY');


-- 3. Fix Mistake Recovery Function Name Mismatch
CREATE OR REPLACE FUNCTION public.get_mistake_recovery_question()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_submission record;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    SELECT s.id, row_to_json(q.*) as question
    INTO v_submission
    FROM public.user_submissions s
    JOIN public.questions q ON q.id = s.question_id
    WHERE s.user_id = v_user_id 
      AND s.is_correct = false 
      AND (s.is_resolved IS NULL OR s.is_resolved = false)
    ORDER BY s.created_at ASC
    LIMIT 1;

    IF v_submission.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_submission.id,
        'question', v_submission.question
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION get_mistake_recovery_question() TO authenticated;