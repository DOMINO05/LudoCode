-- ====================================================================
-- PHASE 4: SHOP ROTATION RPC
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_shop_items()
RETURNS TABLE (
    id uuid,
    name text,
    category public.item_category,
    rarity public.item_rarity,
    cost_gems int,
    metadata jsonb
) AS $$
DECLARE
    v_seed float;
    v_colors text[] := ARRAY['f44336','e91e63','9c27b0','673ab7','3f51b5','2196f3','03a9f4','00bcd4','009688','4caf50','8bc34a','cddc39','ffeb3b','ffc107','ff9800','ff5722','795548','9e9e9e','607d8b','000000'];
BEGIN
    -- Use date as seed for random()
    -- random() accepts a seed only via setseed(), which is global.
    -- Better: use hash of the date string to order by
    v_seed := ('0.' || (abs(hashtext(to_char(now(), 'YYYY-MM-DD'))))::text)::float;
    
    -- We can't easily use setseed() inside a function without affecting everything.
    -- Alternative: use md5(id || date) for deterministic shuffle.
    
    RETURN QUERY
    -- Standard items (always available)
    SELECT s.id, s.name, s.category, s.rarity, s.cost_gems, s.metadata
    FROM public.shop_items s
    WHERE s.category IN ('streak_freeze', 'xp_boost')
    
    UNION ALL
    
    -- Rotating items (5 per day)
    (SELECT s.id, s.name, s.category, s.rarity, s.cost_gems, 
           -- Inject random color into metadata
           s.metadata || jsonb_build_object('dicebear', COALESCE(s.metadata->'dicebear', '{}'::jsonb) || jsonb_build_object('hatColor', v_colors[1 + (abs(hashtext(s.id::text || to_char(now(), 'YYYY-MM-DD'))) % 20)]))
    FROM public.shop_items s
    WHERE s.category NOT IN ('streak_freeze', 'xp_boost')
    ORDER BY md5(s.id::text || to_char(now(), 'YYYY-MM-DD'))
    LIMIT 5);
END;
$$ LANGUAGE plpgsql STABLE;