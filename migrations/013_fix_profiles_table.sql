-- ====================================================================
-- FIX PROFILES TABLE: Add missing columns for serverless transition
-- ====================================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_placement boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_config jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS max_combo int DEFAULT 0,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS last_daily_bonus text,
ADD COLUMN IF NOT EXISTS last_quote_id uuid REFERENCES public.quotes(id);
