-- 随机美图配置表
CREATE TABLE public.random_beauty_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    openid_required boolean DEFAULT false,
    encrypt_openid boolean DEFAULT true,
    group_limits jsonb DEFAULT '{}'::jsonb, -- 格式: { "group_id": limit_count }
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.random_beauty_configs ENABLE ROW LEVEL SECURITY;

-- 权限策略
CREATE POLICY "Allow public read for random_beauty_configs" ON public.random_beauty_configs
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow admin all for random_beauty_configs" ON public.random_beauty_configs
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 随机美图浏览记录（用于统计每日限制）
CREATE TABLE public.random_beauty_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    openid text NOT NULL,
    visit_date date DEFAULT current_date,
    count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(openid, visit_date)
);

-- 启用 RLS
ALTER TABLE public.random_beauty_logs ENABLE ROW LEVEL SECURITY;

-- 权限策略
CREATE POLICY "Allow users to read their own random_beauty_logs" ON public.random_beauty_logs
FOR SELECT TO anon, authenticated USING (true); -- 允许根据 openid 查询

CREATE POLICY "Allow system to upsert random_beauty_logs" ON public.random_beauty_logs
FOR ALL TO anon, authenticated USING (true);

-- 初始化配置
INSERT INTO public.random_beauty_configs (openid_required, encrypt_openid, group_limits)
VALUES (false, true, '{"pt": 5, "vip": 20, "svip": 0}'::jsonb);

-- 增加相关短代码
INSERT INTO public.site_shortcodes (key, value, description, category)
VALUES ('random.beauty_url', '{{site.url}}/refresh-image', '随机美图页面链接', 'system');
