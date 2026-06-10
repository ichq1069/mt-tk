-- 1. 添加 target_id 列用于幂等性校验
ALTER TABLE public.points_logs ADD COLUMN IF NOT EXISTS target_id text;
ALTER TABLE public.growth_logs ADD COLUMN IF NOT EXISTS target_id text;

-- 2. 创建唯一索引防止重复记录
CREATE UNIQUE INDEX IF NOT EXISTS points_logs_target_id_idx ON public.points_logs (user_id, type, target_id) WHERE target_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS growth_logs_target_id_idx ON public.growth_logs (user_id, type, target_id) WHERE target_id IS NOT NULL;

-- 3. 更新 add_user_exp 函数，支持 target_id
CREATE OR REPLACE FUNCTION public.add_user_exp(p_user_id uuid, p_amount integer, p_reason text, p_type text, p_target_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 使用 ON CONFLICT DO NOTHING 防止重复插入
    IF p_target_id IS NOT NULL THEN
        -- 尝试插入日志
        INSERT INTO public.growth_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, p_amount, p_reason, p_type, p_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
        
        -- 如果插入成功，则更新 exp
        IF FOUND THEN
            UPDATE public.profiles SET exp = COALESCE(exp, 0) + p_amount WHERE id = p_user_id;
        END IF;
    ELSE
        -- 无 target_id 的情况，直接处理
        UPDATE public.profiles SET exp = COALESCE(exp, 0) + p_amount WHERE id = p_user_id;
        INSERT INTO public.growth_logs (user_id, amount, reason, type)
        VALUES (p_user_id, p_amount, p_reason, p_type);
    END IF;
END;
$$;

-- 4. 彻底重写 award_user_reward，支持 target_id 并增加幂等性检查
DROP FUNCTION IF EXISTS public.award_user_reward(uuid, text);
CREATE OR REPLACE FUNCTION public.award_user_reward(p_user_id uuid, p_action text, p_target_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_logic jsonb;
    v_action_config jsonb;
    v_points int;
    v_exp int;
    v_limit int;
    v_period int;
    v_count int;
    v_action_name TEXT;
    v_lock_id bigint;
    v_effective_target_id TEXT;
    v_points_added BOOLEAN := FALSE;
    v_exp_added BOOLEAN := FALSE;
BEGIN
    -- 1. 确定实际的 target_id
    v_effective_target_id := p_target_id;
    
    -- 对于每日登录，自动生成基于日期的 target_id
    IF p_action = 'daily_login' AND v_effective_target_id IS NULL THEN
        v_effective_target_id := 'daily_login_' || CURRENT_DATE::text;
    END IF;

    -- 使用咨询锁防止并发竞争
    v_lock_id := hashtext('award_user_reward' || p_user_id::text || p_action || COALESCE(v_effective_target_id, 'none'));
    PERFORM pg_advisory_xact_lock(v_lock_id);

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

    -- 2. 获取配置
    SELECT (value::jsonb) INTO v_logic FROM public.system_configs WHERE key = 'points_logic';
    IF v_logic IS NULL OR NOT (v_logic ? p_action) THEN
        RETURN json_build_object('success', false, 'message', '配置不存在');
    END IF;
    
    v_action_config := v_logic -> p_action;
    v_points := (v_action_config ->> 'points')::int;
    v_exp := (v_action_config ->> 'exp')::int;
    v_limit := (v_action_config ->> 'limit')::int;
    v_period := COALESCE((v_action_config ->> 'period')::int, 1);
    
    -- 3. 检查限制（全局次数限制）
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
    
    -- 4. 幂等性检查：如果存在 target_id，检查是否已发放
    IF v_effective_target_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.points_logs WHERE user_id = p_user_id AND type = p_action AND target_id = v_effective_target_id) THEN
            RETURN json_build_object('success', false, 'message', '该奖励已发放');
        END IF;
    END IF;

    -- 5. 发放奖励
    IF v_points > 0 THEN
        INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, v_points, '奖励: ' || v_action_name, p_action, v_effective_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
        
        IF FOUND THEN
            UPDATE public.profiles SET points = COALESCE(points, 0) + v_points WHERE id = p_user_id;
            v_points_added := TRUE;
        END IF;
    END IF;
    
    IF v_exp > 0 THEN
        INSERT INTO public.growth_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, v_exp, '奖励: ' || v_action_name, p_action, v_effective_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
        
        IF FOUND THEN
            UPDATE public.profiles SET exp = COALESCE(exp, 0) + v_exp WHERE id = p_user_id;
            v_exp_added := TRUE;
        END IF;
    END IF;
    
    IF NOT v_points_added AND NOT v_exp_added AND v_effective_target_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', '该奖励已通过其他途径发放');
    END IF;

    RETURN json_build_object('success', true, 'points', v_points, 'exp', v_exp);
END;
$$;

-- 5. 更新触发器逻辑，使用 target_id
CREATE OR REPLACE FUNCTION public.handle_favorite_growth() RETURNS trigger AS $$
BEGIN
    -- 使用 media_id 作为 target_id 实现幂等性
    PERFORM public.add_user_exp(NEW.user_id, 2, '收藏内容奖励', 'collect', 'favorite_' || NEW.media_id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_visit_growth() RETURNS trigger AS $$
DECLARE
    v_count integer;
BEGIN
    -- 使用 visit_date 作为 target_id
    PERFORM public.add_user_exp(NEW.user_id, 5, '每日登录奖励', 'login', 'visit_' || NEW.visit_date::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_post_growth() RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status::public.item_status = 'approved'::public.item_status) OR 
       (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status::public.item_status != 'approved'::public.item_status) AND NEW.status::public.item_status = 'approved'::public.item_status) THEN
        PERFORM public.add_user_exp(NEW.user_id, 20, '发布内容奖励 (ID: ' || NEW.id || ')', 'post', 'post_' || NEW.id::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
