-- 特控⭐活动配置表
CREATE TABLE IF NOT EXISTS public.star_hunt_activity_configs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    page_paths TEXT[] NOT NULL DEFAULT '{}', -- 投放页面
    total_stars INTEGER NOT NULL DEFAULT 1, -- 特控⭐总数量 (单页展示数量)
    target_count INTEGER NOT NULL DEFAULT 10, -- 收集目标数量
    reward_type TEXT NOT NULL DEFAULT 'points', -- points, physical, coupon
    reward_content JSONB DEFAULT '{}'::jsonb,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_at TIMESTAMP WITH TIME ZONE,
    star_icon_url TEXT,
    bottle_icon_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 特控⭐收集记录表
CREATE TABLE IF NOT EXISTS public.star_hunt_collection_records (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES public.star_hunt_activity_configs(id) ON DELETE CASCADE,
    collected_count INTEGER NOT NULL DEFAULT 0,
    collection_history JSONB DEFAULT '[]'::jsonb, -- [{time: string, page: string}]
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    reward_claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, activity_id)
);

-- RLS 策略
ALTER TABLE public.star_hunt_activity_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.star_hunt_collection_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人可查看活动配置" ON public.star_hunt_activity_configs FOR SELECT USING (true);
CREATE POLICY "管理员可管理活动配置" ON public.star_hunt_activity_configs FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "用户可查看自己的收集记录" ON public.star_hunt_collection_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "用户可更新自己的收集记录" ON public.star_hunt_collection_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "管理员可查看所有收集记录" ON public.star_hunt_collection_records FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 辅助函数：安全增加收集数量
CREATE OR REPLACE FUNCTION public.increment_star_collection(
    p_user_id UUID,
    p_activity_id UUID,
    p_page_path TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_config RECORD;
    v_record RECORD;
    v_new_count INTEGER;
    v_is_completed BOOLEAN := false;
    v_completed_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. 获取活动配置
    SELECT * INTO v_config FROM star_hunt_activity_configs WHERE id = p_activity_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '活动不存在或已结束');
    END IF;

    -- 2. 获取或创建用户记录
    INSERT INTO star_hunt_collection_records (user_id, activity_id)
    VALUES (p_user_id, p_activity_id)
    ON CONFLICT (user_id, activity_id) DO NOTHING;

    SELECT * INTO v_record FROM star_hunt_collection_records WHERE user_id = p_user_id AND activity_id = p_activity_id;

    -- 3. 检查是否已完成
    IF v_record.is_completed THEN
        RETURN jsonb_build_object('success', true, 'message', '已完成收集', 'data', v_record);
    END IF;

    -- 4. 增加数量
    v_new_count := v_record.collected_count + 1;
    IF v_new_count >= v_config.target_count THEN
        v_is_completed := true;
        v_completed_at := now();
    END IF;

    -- 5. 更新记录
    UPDATE star_hunt_collection_records
    SET 
        collected_count = v_new_count,
        collection_history = collection_history || jsonb_build_object('time', now(), 'page', p_page_path),
        is_completed = v_is_completed,
        completed_at = v_completed_at,
        updated_at = now()
    WHERE id = v_record.id;

    -- 6. 如果完成且奖励是积分，自动发放
    IF v_is_completed AND v_config.reward_type = 'points' THEN
        PERFORM add_user_points_safe(p_user_id, (v_config.reward_content->>'amount')::INTEGER, '特控⭐挑战奖励');
        UPDATE star_hunt_collection_records SET reward_claimed = true WHERE id = v_record.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'data', jsonb_build_object(
            'collected_count', v_new_count,
            'target_count', v_config.target_count,
            'is_completed', v_is_completed
        )
    );
END;
$$;
