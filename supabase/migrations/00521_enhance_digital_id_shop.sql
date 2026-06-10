-- 增强靓号池表
ALTER TABLE public.special_digital_ids 
ADD COLUMN IF NOT EXISTS required_rank text DEFAULT '初出茅庐',
ADD COLUMN IF NOT EXISTS category text DEFAULT '普通';

-- 创建购买靓号的 RPC 函数
CREATE OR REPLACE FUNCTION public.buy_special_digital_id(
    p_user_id uuid,
    p_special_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_digital_id text;
    v_price integer;
    v_points integer;
    v_is_sold boolean;
BEGIN
    -- 1. 获取靓号信息
    SELECT digital_id, price, is_sold INTO v_digital_id, v_price, v_is_sold
    FROM public.special_digital_ids
    WHERE id = p_special_id;

    IF v_digital_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '靓号不存在');
    END IF;

    IF v_is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', '该靓号已被售出');
    END IF;

    -- 2. 检查用户积分
    SELECT points INTO v_points FROM public.profiles WHERE id = p_user_id;
    IF v_points < v_price THEN
        RETURN jsonb_build_object('success', false, 'error', '积分不足');
    END IF;

    -- 3. 检查用户是否已有数字 ID (可选，如果业务要求每人一个)
    -- 这里假设可以更换，但在前端已经做了限制
    
    -- 4. 执行扣费和更新
    UPDATE public.profiles 
    SET points = points - v_price,
        digital_id = v_digital_id
    WHERE id = p_user_id;

    UPDATE public.special_digital_ids 
    SET is_sold = true,
        owner_id = p_user_id
    WHERE id = p_special_id;

    -- 5. 记录积分日志 (如果有点数日志表)
    INSERT INTO public.points_logs (user_id, points, type, reason)
    VALUES (p_user_id, -v_price, 'consume', '购买靓号: ' || v_digital_id);

    RETURN jsonb_build_object('success', true, 'digital_id', v_digital_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_special_digital_id(uuid, uuid) TO authenticated;
