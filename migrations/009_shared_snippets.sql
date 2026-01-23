-- 1. Create shared_snippets table
CREATE TABLE IF NOT EXISTS public.shared_snippets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  code text NOT NULL,
  language text NOT NULL,
  title text,
  is_editable boolean DEFAULT false,
  share_code varchar(6) UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_snippets_share_code ON public.shared_snippets(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_snippets_creator ON public.shared_snippets(creator_id);

-- 3. Enable RLS
ALTER TABLE public.shared_snippets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Anyone can read snippets (via share code)
CREATE POLICY "Anyone can read snippets" 
  ON public.shared_snippets FOR SELECT 
  USING (true);

-- Authenticated users can create snippets
CREATE POLICY "Users can create snippets" 
  ON public.shared_snippets FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own snippets
CREATE POLICY "Users can update own snippets" 
  ON public.shared_snippets FOR UPDATE 
  USING (auth.uid() = creator_id);

-- Users can delete their own snippets
CREATE POLICY "Users can delete own snippets" 
  ON public.shared_snippets FOR DELETE 
  USING (auth.uid() = creator_id);

-- 5. Update/Create Trigger Functions for Share Code Generation

-- Function to check uniqueness across BOTH tables
CREATE OR REPLACE FUNCTION is_share_code_taken(code varchar)
RETURNS boolean AS $$
BEGIN
  PERFORM 1 FROM public.custom_quizzes WHERE share_code = code;
  IF FOUND THEN RETURN true; END IF;
  
  PERFORM 1 FROM public.shared_snippets WHERE share_code = code;
  IF FOUND THEN RETURN true; END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Update the existing trigger function for Quizzes to check both tables
CREATE OR REPLACE FUNCTION set_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    LOOP
      NEW.share_code := generate_share_code(); -- Reuses existing generation logic
      IF NOT is_share_code_taken(NEW.share_code) THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create similar trigger function for Snippets (can basically be the same logic)
CREATE OR REPLACE FUNCTION set_snippet_share_code()
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

-- Attach trigger to shared_snippets
CREATE TRIGGER trigger_set_snippet_share_code
  BEFORE INSERT ON public.shared_snippets
  FOR EACH ROW
  EXECUTE FUNCTION set_snippet_share_code();
