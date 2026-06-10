-- 创建每日登录奖励函数
CREATE OR REPLACE FUNCTION public.handle_daily_login_growth(p_user_id UUID)
RETURNS json AS $$
DECLARE
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' + INTERVAL '8 hours')::date;
    v_exists BOOLEAN;
BEGIN
    -- 检查今天是否已经领过登录奖励
    SELECT EXISTS (
        SELECT 1 FROM public.growth_logs 
        WHERE user_id = p_user_id 
        AND type = 'login' 
        AND (created_at AT TIME ZONE 'UTC' + INTERVAL '8 hours')::date = v_today
    ) INTO v_exists;

    IF NOT v_exists THEN
        PERFORM public.add_user_exp(p_user_id, 5, '每日登录奖励', 'login');
        RETURN json_build_object('success', true, 'awarded', 5);
    END IF;

    RETURN json_build_object('success', false, 'awarded', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
