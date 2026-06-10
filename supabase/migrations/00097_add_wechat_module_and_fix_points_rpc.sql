-- 1. 创建积分奖励 RPC
CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id UUID,
    p_amount INT,
    p_reason TEXT,
    p_type TEXT DEFAULT 'system'
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles SET points = points + p_amount WHERE id = p_user_id;
    INSERT INTO public.points_logs (user_id, points, reason, type)
    VALUES (p_user_id, p_amount, p_reason, p_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建微信公众号配置表
CREATE TABLE IF NOT EXISTS public.wechat_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'service_auth', 'subscription_unauth'
    appid TEXT NOT NULL,
    appsecret TEXT NOT NULL,
    token TEXT,
    aes_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 设置权限
ALTER TABLE public.wechat_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can full manage wechat_configs" ON public.wechat_configs
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. 补全 check-in edge function 需要的 signin_configs 
-- 已经在数据库里有了，不用补。

-- 4. 调整 handle_check_in_growth 以防万一
-- 我们可以查询奖励配置中的 exp
CREATE OR REPLACE FUNCTION public.handle_check_in_growth()
RETURNS trigger AS $$
DECLARE
    v_streak INT;
    v_day_number INT;
    v_exp INT;
BEGIN
    -- 计算连续天数 (简化：直接查记录数)
    -- 这里为了性能和复杂性，我们在 SQL 里也算一下
    WITH RECURSIVE streaks AS (
        SELECT check_in_date, 1 as count
        FROM public.check_ins
        WHERE user_id = NEW.user_id AND check_in_date = (NEW.check_in_date - INTERVAL '1 day')::date
        UNION ALL
        SELECT c.check_in_date, s.count + 1
        FROM public.check_ins c
        JOIN streaks s ON c.check_in_date = (s.check_in_date - INTERVAL '1 day')::date
        WHERE c.user_id = NEW.user_id
    )
    SELECT COALESCE(MAX(count), 0) + 1 INTO v_streak FROM streaks;
    
    v_day_number := ((v_streak - 1) % 7) + 1;
    
    SELECT exp_reward INTO v_exp FROM public.signin_configs WHERE day_number = v_day_number;
    
    IF v_exp IS NULL THEN v_exp := 10; END IF;
    
    PERFORM public.add_user_exp(NEW.user_id, v_exp, '签到奖励 (第 ' || v_streak || ' 天)', 'checkin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
