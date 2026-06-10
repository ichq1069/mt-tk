CREATE OR REPLACE FUNCTION public.buy_special_id(p_user_id uuid, p_special_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_digital_id text;
    v_price integer;
    v_is_sold boolean;
    v_required_rank text;
    v_user_exp integer;
    v_required_exp integer;
    v_user_current_points integer;
BEGIN
    -- 1. 检查用户是否已经购买过靓号 (一人限一次)
    IF EXISTS (SELECT 1 FROM public.points_logs WHERE user_id = p_user_id AND type = 'buy_id') THEN
        RETURN jsonb_build_object('success', false, 'error', '您已购买过专属 ID，每位用户仅限购买一次');
    END IF;

    -- 2. 获取靓号信息
    SELECT digital_id, price, is_sold, required_rank INTO v_digital_id, v_price, v_is_sold, v_required_rank
    FROM public.special_digital_ids 
    WHERE id = p_special_id;

    IF v_is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', '该号码已被售出');
    END IF;

    -- 3. 获取用户信息
    SELECT exp, points INTO v_user_exp, v_user_current_points FROM public.profiles WHERE id = p_user_id;
    
    -- 4. 检查等级要求
    IF v_required_rank IS NOT NULL AND v_required_rank <> '' THEN
        SELECT min_exp INTO v_required_exp FROM public.rank_configs WHERE name = v_required_rank;
        
        IF v_required_exp IS NOT NULL AND (v_user_exp IS NULL OR v_user_exp < v_required_exp) THEN
            RETURN jsonb_build_object('success', false, 'error', '您的等级不足以购买此号码 (需要: ' || v_required_rank || ')');
        END IF;
    END IF;

    -- 5. 检查积分是否足够
    IF v_user_current_points < v_price THEN
        RETURN jsonb_build_object('success', false, 'error', '积分不足');
    END IF;

    -- 6. 扣除积分并更新用户 ID
    UPDATE public.profiles 
    SET points = points - v_price, 
        digital_id = v_digital_id 
    WHERE id = p_user_id;

    -- 7. 标记靓号已售出
    UPDATE public.special_digital_ids 
    SET is_sold = true 
    WHERE id = p_special_id;

    -- 8. 记录日志
    INSERT INTO public.points_logs (user_id, amount, type, reason)
    VALUES (p_user_id, -v_price, 'buy_id', '购买靓号: ' || v_digital_id);

    RETURN jsonb_build_object('success', true, 'digital_id', v_digital_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;