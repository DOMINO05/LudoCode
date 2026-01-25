-- ====================================================================
-- PHASE 4: FRIENDSHIP TABLE & RLS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.friendship (
    follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.friendship ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see all friendships" ON public.friendship FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.friendship FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.friendship FOR DELETE USING (auth.uid() = follower_id);