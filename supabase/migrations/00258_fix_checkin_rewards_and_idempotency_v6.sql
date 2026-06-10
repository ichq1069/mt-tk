-- 1. 更新 add_user_points 函数，支持 target_id 和幂等性
CREATE OR REPLACE FUNCTION public.add_user_points(p_user_id uuid, p_amount integer, p_reason text, p_type text, p_target_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_target_id IS NOT NULL THEN
        -- 尝试插入日志 (使用 ON CONFLICT DO NOTHING)
        INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, p_amount, p_reason, p_type, p_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
        
        -- 如果插入成功 (FOUND 为真)，则更新用户积分
        IF FOUND THEN
            UPDATE public.profiles SET points = COALESCE(points, 0) + p_amount WHERE id = p_user_id;
        END IF;
    ELSE
        -- 无 target_id 的传统模式
        UPDATE public.profiles SET points = COALESCE(points, 0) + p_amount WHERE id = p_user_id;
        INSERT INTO public.points_logs (user_id, amount, reason, type)
        VALUES (p_user_id, p_amount, p_reason, p_type);
    END IF;
END;
$$;

-- 2. 更新 check_ins 表触发器逻辑，统一处理奖励
CREATE OR REPLACE FUNCTION public.handle_check_in_growth() RETURNS trigger AS $$
DECLARE
    v_streak INT;
    v_day_number INT;
    v_exp INT;
    v_max_day INT;
    v_target_id TEXT;
BEGIN
    v_target_id := 'checkin_' || NEW.user_id::text || '_' || NEW.check_in_date::text;

    -- 计算连续签到天数 (包含当天)
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
    
    -- 获取连续签到奖励配置
    SELECT MAX(day_number) INTO v_max_day FROM public.signin_configs;
    v_day_number := ((v_streak - 1) % COALESCE(v_max_day, 7)) + 1;
    
    SELECT exp_reward INTO v_exp FROM public.signin_configs WHERE day_number = v_day_number;
    IF v_exp IS NULL THEN v_exp := 10; END IF;
    
    -- 发放经验奖励 (幂等)
    PERFORM public.add_user_exp(
        NEW.user_id, 
        v_exp, 
        '连续第 ' || v_streak || ' 天签到经验奖励', 
        'checkin', 
        v_target_id || '_exp'
    );
    
    -- 发放积分奖励 (使用 check_ins 表中的 points_earned 字段，幂等)
    IF NEW.points_earned > 0 THEN
        PERFORM public.add_user_points(
            NEW.user_id, 
            NEW.points_earned, 
            '连续第 ' || v_streak || ' 天签到积分奖励', 
            'checkin', 
            v_target_id || '_points'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 确保触发器已正确绑定
DROP TRIGGER IF EXISTS tr_check_in_growth ON public.check_ins;
CREATE TRIGGER tr_check_in_growth
AFTER INSERT ON public.check_ins
FOR EACH ROW EXECUTE FUNCTION public.handle_check_in_growth();
