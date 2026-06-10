-- 1. 创建勋章分类表
CREATE TABLE IF NOT EXISTS public.badge_categories (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    name text NOT NULL,
    icon text,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT badge_categories_pkey PRIMARY KEY (id)
);

-- 启用 RLS
ALTER TABLE public.badge_categories ENABLE ROW LEVEL SECURITY;

-- 权限策略
DROP POLICY IF EXISTS "Anyone can view categories" ON public.badge_categories;
CREATE POLICY "Anyone can view categories" ON public.badge_categories FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.badge_categories;
CREATE POLICY "Admins can manage categories" ON public.badge_categories FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'));

-- 插入默认分类
INSERT INTO public.badge_categories (name, sort_order) VALUES 
('月度限定', 1),
('新品系列', 2),
('成就系列', 3),
('专属系列', 4)
ON CONFLICT DO NOTHING;

-- 2. 修改勋章表以关联分类（可选，目前保留 string category 以保证兼容性，但增加分类管理）

-- 3. 自动授勋核心函数
CREATE OR REPLACE FUNCTION public.check_and_grant_auto_badges(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_task RECORD;
    v_current_val integer;
BEGIN
    FOR v_task IN 
        SELECT bt.*, b.name as badge_name 
        FROM public.badge_tasks bt
        JOIN public.badges b ON b.id = bt.badge_id
        WHERE bt.is_active = true 
          AND bt.claim_type = 'auto'
          AND NOT EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = bt.badge_id)
    LOOP
        -- 获取当前指标值
        CASE v_task.task_type
            WHEN 'checkin_count' THEN
                SELECT count(*) INTO v_current_val FROM public.check_ins WHERE user_id = p_user_id;
            WHEN 'upload_count' THEN
                SELECT count(*) INTO v_current_val FROM public.media_items WHERE user_id = p_user_id AND status = 'approved';
            WHEN 'favorite_count' THEN
                SELECT count(*) INTO v_current_val FROM public.favorites WHERE user_id = p_user_id;
            ELSE
                v_current_val := 0;
        END CASE;

        -- 满足条件则授勋
        IF v_current_val >= v_task.target_value THEN
            INSERT INTO public.user_badges (user_id, badge_id, unlocked_at)
            VALUES (p_user_id, v_task.badge_id, now())
            ON CONFLICT (user_id, badge_id) DO NOTHING;
            
            -- 发送系统通知（可选）
            INSERT INTO public.notifications (user_id, title, content, type)
            VALUES (p_user_id, '获得新勋章', '恭喜！您已达成条件，系统自动为您发放了【' || v_task.badge_name || '】勋章。', 'system');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 触发器绑定
-- 签到后检查
CREATE OR REPLACE FUNCTION public.trig_check_badges_on_checkin() RETURNS trigger AS $$
BEGIN
    PERFORM public.check_and_grant_auto_badges(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_badges_on_checkin ON public.check_ins;
CREATE TRIGGER tr_check_badges_on_checkin AFTER INSERT ON public.check_ins FOR EACH ROW EXECUTE FUNCTION public.trig_check_badges_on_checkin();

-- 收藏后检查
CREATE OR REPLACE FUNCTION public.trig_check_badges_on_favorite() RETURNS trigger AS $$
BEGIN
    PERFORM public.check_and_grant_auto_badges(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_badges_on_favorite ON public.favorites;
CREATE TRIGGER tr_check_badges_on_favorite AFTER INSERT ON public.favorites FOR EACH ROW EXECUTE FUNCTION public.trig_check_badges_on_favorite();

-- 媒体审核通过后检查
CREATE OR REPLACE FUNCTION public.trig_check_badges_on_media_approve() RETURNS trigger AS $$
BEGIN
    IF (OLD.status != 'approved' AND NEW.status = 'approved') THEN
        PERFORM public.check_and_grant_auto_badges(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_badges_on_media_approve ON public.media_items;
CREATE TRIGGER tr_check_badges_on_media_approve AFTER UPDATE ON public.media_items FOR EACH ROW EXECUTE FUNCTION public.trig_check_badges_on_media_approve();
