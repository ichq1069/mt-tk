CREATE OR REPLACE FUNCTION public.award_user_reward(p_user_id uuid, p_action text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_logic jsonb;  -- 修复：从 json 改为 jsonb
    v_action_config jsonb; -- 修复：从 json 改为 jsonb
    v_points int;
    v_exp int;
    v_limit int;
    v_period int;
    v_count int;
    v_result json;
BEGIN
    -- 1. 获取配置
    SELECT (value::jsonb) INTO v_logic FROM public.system_configs WHERE key = 'points_logic';
    
    IF v_logic IS NULL OR NOT (v_logic ? p_action) THEN
        RETURN json_build_object('success', false, 'message', '配置不存在');
    END IF;
    
    v_action_config := v_logic -> p_action;
    v_points := (v_action_config ->> 'points')::int;
    v_exp := (v_action_config ->> 'exp')::int;
    v_limit := (v_action_config ->> 'limit')::int;
    v_period := COALESCE((v_action_config ->> 'period')::int, 1);
    
    -- 2. 检查限制 (0 表示无限制)
    IF v_limit > 0 THEN
        IF p_action = 'daily_login' THEN
            -- 专门处理每日登录，检查今日是否有积分记录
            SELECT count(*) INTO v_count 
            FROM public.points_logs 
            WHERE user_id = p_user_id 
              AND type = p_action
              AND created_at >= CURRENT_DATE;
        ELSE
            -- 通用操作限制检查
            SELECT count(*) INTO v_count 
            FROM public.points_logs 
            WHERE user_id = p_user_id 
              AND type = p_action
              AND created_at >= (CURRENT_DATE - (v_period - 1) * interval '1 day');
        END IF;
        
        IF v_count >= v_limit THEN
            RETURN json_build_object('success', false, 'message', '已达到奖励次数上限');
        END IF;
    END IF;
    
    -- 3. 发放奖励
    IF v_points > 0 THEN
        UPDATE public.profiles SET points = COALESCE(points, 0) + v_points WHERE id = p_user_id;
        INSERT INTO public.points_logs (user_id, amount, reason, type)
        VALUES (p_user_id, v_points, '奖励: ' || p_action, p_action);
    END IF;
    
    IF v_exp > 0 THEN
        UPDATE public.profiles SET exp = COALESCE(exp, 0) + v_exp WHERE id = p_user_id;
        INSERT INTO public.growth_logs (user_id, amount, reason, type)
        VALUES (p_user_id, v_exp, '奖励: ' || p_action, p_action);
    END IF;
    
    RETURN json_build_object('success', true, 'points', v_points, 'exp', v_exp);
END;
$function$;
