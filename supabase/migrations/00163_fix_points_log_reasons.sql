-- 1. 修复 log_point_changes 触发器函数中的 (数据库触发) 字样
CREATE OR REPLACE FUNCTION log_point_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(OLD.points, 0) <> NEW.points THEN
    INSERT INTO points_logs (user_id, amount, reason)
    VALUES (NEW.id, NEW.points - COALESCE(OLD.points, 0), '系统自动同步');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 修复 award_user_reward 函数中的英文行为名称
CREATE OR REPLACE FUNCTION award_user_reward(p_user_id UUID, p_action TEXT)
RETURNS json AS $$
DECLARE
    v_logic jsonb;
    v_action_config jsonb;
    v_points int;
    v_exp int;
    v_limit int;
    v_period int;
    v_count int;
    v_action_name TEXT;
BEGIN
    -- 获取动作对应的中文名称
    v_action_name := CASE 
        WHEN p_action = 'image_publish' THEN '发布图片'
        WHEN p_action = 'video_publish' THEN '发布视频'
        WHEN p_action = 'favorite' THEN '作品收藏'
        WHEN p_action = 'comment' THEN '发表评论'
        WHEN p_action = 'report' THEN '有效举报'
        WHEN p_action = 'daily_login' THEN '每日登录'
        ELSE p_action
    END;

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
    
    -- 2. 检查限制
    IF v_limit > 0 THEN
        IF p_action = 'daily_login' THEN
            SELECT count(*) INTO v_count 
            FROM public.points_logs 
            WHERE user_id = p_user_id 
              AND type = p_action
              AND created_at >= CURRENT_DATE;
        ELSE
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
        VALUES (p_user_id, v_points, '奖励: ' || v_action_name, p_action);
    END IF;
    
    IF v_exp > 0 THEN
        UPDATE public.profiles SET exp = COALESCE(exp, 0) + v_exp WHERE id = p_user_id;
        INSERT INTO public.growth_logs (user_id, amount, reason, type)
        VALUES (p_user_id, v_exp, '奖励: ' || v_action_name, p_action);
    END IF;
    
    RETURN json_build_object('success', true, 'points', v_points, 'exp', v_exp);
END;
$$ LANGUAGE plpgsql;
