-- ====================================================================
-- PHASE 8: FORCE CONSTRAINT
-- Ensure unique constraint exists for ON CONFLICT clause
-- ====================================================================

-- 1. Clean up potential duplicates
DELETE FROM public.user_concept_mastery a USING public.user_concept_mastery b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.concept_id = b.concept_id;

-- 2. Drop existing constraints if they exist (to be safe and recreate)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_concept_mastery_pkey') THEN
        ALTER TABLE public.user_concept_mastery DROP CONSTRAINT user_concept_mastery_pkey;
    END IF;
    -- Check for unique index too
    DROP INDEX IF EXISTS user_concept_mastery_user_id_concept_id_key;
END $$;

-- 3. Add Primary Key Constraint explicitly
ALTER TABLE public.user_concept_mastery 
ADD CONSTRAINT user_concept_mastery_pkey PRIMARY KEY (user_id, concept_id);