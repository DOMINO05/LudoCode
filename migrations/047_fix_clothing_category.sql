-- 47. Fix clothing items category and add 'clothing' to item_category enum
-- First, add 'clothing' to the enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_category') THEN
        CREATE TYPE item_category AS ENUM ('streak_freeze', 'theme', 'avatar_frame', 'xp_boost', 'hat', 'accessory', 'pet', 'clothing');
    ELSE
        -- Add 'clothing' to existing enum
        ALTER TYPE item_category ADD VALUE IF NOT EXISTS 'clothing';
    END IF;
END $$;

-- Update existing clothing items that were mistakenly marked as 'theme'
UPDATE public.shop_items 
SET category = 'clothing'
WHERE name LIKE 'Outfit%';

-- Re-generate clothing items if missing or to ensure consistency
DO $do$
BEGIN
  FOR i IN 1..23 LOOP
    -- Check if it exists by name, if so just update category, else insert
    IF EXISTS (SELECT 1 FROM public.shop_items WHERE name = 'Outfit V' || i) THEN
        UPDATE public.shop_items 
        SET category = 'clothing',
            metadata = jsonb_build_object('dicebear', jsonb_build_object('clothing', 'variant' || to_char(i, 'FM00')))
        WHERE name = 'Outfit V' || i;
    ELSE
        INSERT INTO public.shop_items (name, category, rarity, cost_gems, metadata)
        VALUES ('Outfit V' || i, 'clothing', 'common', 200, jsonb_build_object('dicebear', jsonb_build_object('clothing', 'variant' || to_char(i, 'FM00'))));
    END IF;
  END LOOP;
END $do$;
