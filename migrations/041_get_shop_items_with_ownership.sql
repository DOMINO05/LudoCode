-- 41. Update get_shop_items to include is_owned for current user
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
BEGIN
    RETURN QUERY
    SELECT 
        si.id,
        si.category,
        si.name,
        si.cost_gems,
        si.metadata,
        EXISTS (
            SELECT 1 FROM public.user_inventory ui 
            WHERE ui.user_id = v_user_id AND ui.item_id = si.id
        ) as is_owned
    FROM public.shop_items si
    ORDER BY si.category, si.cost_gems;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
