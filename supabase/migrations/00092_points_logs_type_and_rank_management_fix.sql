-- 1. 为 points_logs 添加 type 字段
ALTER TABLE public.points_logs ADD COLUMN IF NOT EXISTS type text;

-- 2. 创建用户等级配置表 (Rank management)
CREATE TABLE IF NOT EXISTS public.rank_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    min_points integer DEFAULT 0,
    icon text,
    created_at timestamp with time zone DEFAULT now()
);

-- 初始化一些等级
INSERT INTO public.rank_configs (name, min_points) VALUES
('初出茅庐', 0),
('练气期1层', 100),
('练气期3层', 300),
('练气期6层', 600),
('练气期9层', 900),
('筑基期1层', 1500),
('结丹期1层', 5000),
('元婴期1层', 10000)
ON CONFLICT (name) DO NOTHING;

-- 3. 自动更新用户等级的函数
CREATE OR REPLACE FUNCTION public.update_user_rank()
RETURNS trigger AS $$
DECLARE
    new_rank text;
BEGIN
    -- 找到符合点数要求的最高等级
    SELECT name INTO new_rank 
    FROM public.rank_configs 
    WHERE min_points <= NEW.points 
    ORDER BY min_points DESC 
    LIMIT 1;

    NEW.rank := COALESCE(new_rank, '初出茅庐');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器：当用户点数变化时自动更新等级
DROP TRIGGER IF EXISTS tr_update_user_rank ON public.profiles;
CREATE TRIGGER tr_update_user_rank
BEFORE UPDATE OF points ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_rank();

-- 4. 修复买靓号 RPC (确保 type 字段被正确插入)
CREATE OR REPLACE FUNCTION public.buy_special_id(p_user_id uuid, p_special_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_digital_id text;
    v_price integer;
    v_user_points integer;
    v_is_sold boolean;
    v_required_rank text;
    v_user_rank text;
    v_required_points integer;
    v_user_current_points integer;
BEGIN
    -- 1. 获取靓号信息
    SELECT digital_id, price, is_sold, required_rank INTO v_digital_id, v_price, v_is_sold, v_required_rank
    FROM public.special_digital_ids 
    WHERE id = p_special_id;

    IF v_is_sold THEN
        RETURN jsonb_build_object('success', false, 'error', '该号码已被售出');
    END IF;

    -- 2. 检查等级要求
    SELECT rank, points INTO v_user_rank, v_user_current_points FROM public.profiles WHERE id = p_user_id;
    
    -- 获取要求等级的最低积分值
    SELECT min_points INTO v_required_points FROM public.rank_configs WHERE name = v_required_rank;
    
    -- 如果找到了要求等级，且当前用户的积分值（也就是其等级对应的积分值基础）不满足该等级要求
    -- 简单起见，这里直接比对 profiles 表里的 rank
    -- 或者查出两个 rank 的权值进行比对
    -- 我们暂时直接按 min_points 比较
    IF v_required_points IS NOT NULL AND v_user_current_points < v_required_points THEN
        RETURN jsonb_build_object('success', false, 'error', '您的等级不足以购买此号码 (需要: ' || v_required_rank || ')');
    END IF;

    IF v_user_current_points < v_price THEN
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

    -- 5. 记录日志 (确保 type 字段存在)
    INSERT INTO public.points_logs (user_id, amount, type, reason)
    VALUES (p_user_id, -v_price, 'buy_id', '购买靓号: ' || v_digital_id);

    RETURN jsonb_build_object('success', true, 'digital_id', v_digital_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
