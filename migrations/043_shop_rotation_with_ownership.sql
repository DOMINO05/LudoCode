-- 43. Update get_shop_items with both rotation and ownership
-- Updated to LIMIT 3 random items
DROP FUNCTION IF EXISTS public.get_shop_items();
CREATE OR REPLACE FUNCTION public.get_shop_items()
RETURNS TABLE (
    id uuid,
    category public.item_category,
    name text,
    cost_gems int,
    metadata jsonb,
    is_owned boolean
) AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_date_seed text := to_char(now(), 'YYYY-MM-DD');
BEGIN
    RETURN QUERY
    -- Always show consumables
    SELECT 
        si.id, si.category, si.name, si.cost_gems, si.metadata,
        EXISTS (SELECT 1 FROM public.user_inventory ui WHERE ui.user_id = v_user_id AND ui.item_id = si.id) as is_owned
    FROM public.shop_items si
    WHERE si.category IN ('streak_freeze', 'xp_boost')
    
    UNION ALL
    
    -- Show 3 random cosmetics per day
    (SELECT 
        si.id, si.category, si.name, si.cost_gems, si.metadata,
        EXISTS (SELECT 1 FROM public.user_inventory ui WHERE ui.user_id = v_user_id AND ui.item_id = si.id) as is_owned
    FROM public.shop_items si
    WHERE si.category NOT IN ('streak_freeze', 'xp_boost')
    ORDER BY md5(si.id::text || v_date_seed)
    LIMIT 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
