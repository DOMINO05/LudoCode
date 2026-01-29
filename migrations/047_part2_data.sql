-- 47. Fix clothing items category
-- Part 2: Update existing items and generate new ones
UPDATE public.shop_items 
SET category = 'clothing'
WHERE name LIKE 'Outfit%';

DO $do$
BEGIN
  FOR i IN 1..23 LOOP
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
