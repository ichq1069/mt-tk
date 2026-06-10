-- RPC: 购买靓号
CREATE OR REPLACE FUNCTION public.buy_special_id(p_user_id uuid, p_special_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_digital_id text;
    v_price integer;
    v_user_points integer;
    v_is_sold boolean;
BEGIN
    -- 1. 获取靓号信息
    SELECT digital_id, price, is_sold INTO v_digital_id, v_price, v_is_sold 
    FROM public.special_digital_ids 
    WHERE id = p_special_id;

    IF v_is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', '该号码已被售出');
    END IF;

    -- 2. 检查用户积分
    SELECT points INTO v_user_points FROM public.profiles WHERE id = p_user_id;
    IF v_user_points < v_price THEN
        RETURN jsonb_build_object('success', false, 'error', '积分不足');
    END IF;

    -- 3. 扣除积分并更新用户 ID
    UPDATE public.profiles 
    SET points = points - v_price, 
        digital_id = v_digital_id 
    WHERE id = p_user_id;

    -- 4. 标记靓号已售出
    UPDATE public.special_digital_ids 
    SET is_sold = true 
    WHERE id = p_special_id;

    -- 5. 记录日志
    INSERT INTO public.points_logs (user_id, amount, type, description)
    VALUES (p_user_id, -v_price, 'buy_id', '购买靓号: ' || v_digital_id);

    RETURN jsonb_build_object('success', true, 'digital_id', v_digital_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
