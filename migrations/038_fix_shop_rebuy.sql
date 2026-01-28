-- 38. Fix shop rebuy logic in RPC
-- Prevents re-buying durable items and increments quantity for consumables

CREATE OR REPLACE FUNCTION public.buy_shop_item(p_item_id uuid, p_expected_cost int, p_metadata jsonb DEFAULT '{}')
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_user_gems int;
    v_item_category public.item_category;
    v_existing_id uuid;
    v_new_inventory_id uuid;
BEGIN
    -- 1. Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Get user gems and lock the row for update
    SELECT gems INTO v_user_gems FROM public.profiles WHERE id = v_user_id FOR UPDATE;
    
    -- 3. Check if user has enough gems
    IF v_user_gems < p_expected_cost THEN
        RAISE EXCEPTION 'Not enough gems';
    END IF;

    -- 4. Get item category
    SELECT category INTO v_item_category FROM public.shop_items WHERE id = p_item_id;

    -- 5. Check if already owned
    SELECT id INTO v_existing_id FROM public.user_inventory 
    WHERE user_id = v_user_id AND item_id = p_item_id;

    IF v_existing_id IS NOT NULL THEN
        IF v_item_category IN ('streak_freeze', 'xp_boost') THEN
            -- Consumable: increment quantity
            UPDATE public.user_inventory 
            SET quantity = quantity + 1 
            WHERE id = v_existing_id;

            -- Deduct gems
            UPDATE public.profiles 
            SET gems = gems - p_expected_cost 
            WHERE id = v_user_id;

            RETURN jsonb_build_object(
                'success', true,
                'updated', true,
                'new_gem_count', v_user_gems - p_expected_cost
            );
        ELSE
            -- Durable: prevent re-purchase
            RAISE EXCEPTION 'Item already owned';
        END IF;
    END IF;

    -- 6. New purchase: Deduct gems
    UPDATE public.profiles 
    SET gems = gems - p_expected_cost 
    WHERE id = v_user_id;

    -- 7. Add to inventory
    INSERT INTO public.user_inventory (user_id, item_id, quantity, metadata)
    VALUES (v_user_id, p_item_id, 1, p_metadata)
    RETURNING id INTO v_new_inventory_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_gem_count', v_user_gems - p_expected_cost,
        'inventory_id', v_new_inventory_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
