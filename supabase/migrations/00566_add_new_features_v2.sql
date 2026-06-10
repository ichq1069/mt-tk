-- 1. 每日图集多公众号密码配置
CREATE TABLE IF NOT EXISTS public.wechat_account_password_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL, -- 关联微信公众号账户ID
    password_pattern TEXT DEFAULT '6_digit_number', -- 密码生成规则
    push_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 每日图集多公众号独立密码映射表
CREATE TABLE IF NOT EXISTS public.daily_gallery_account_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.daily_gallery_posts(id) ON DELETE CASCADE,
    wechat_account_id UUID NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, wechat_account_id)
);

-- 3. 视频代理配置表（包含智能路由和成本分析配置）
CREATE TABLE IF NOT EXISTS public.video_proxy_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_strategy TEXT DEFAULT 'latency', -- latency, success_rate, geo, round_robin
    routing_weights JSONB DEFAULT '{}',
    billing_rules JSONB DEFAULT '{}', -- 计费规则
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 视频代理日志增加流量和成本字段
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_proxy_logs' AND column_name = 'bytes_transferred') THEN
        ALTER TABLE public.video_proxy_logs ADD COLUMN bytes_transferred BIGINT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_proxy_logs' AND column_name = 'estimated_cost') THEN
        ALTER TABLE public.video_proxy_logs ADD COLUMN estimated_cost NUMERIC(10, 4) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_proxy_logs' AND column_name = 'proxy_node_id') THEN
        ALTER TABLE public.video_proxy_logs ADD COLUMN proxy_node_id TEXT;
    END IF;
END $$;

-- 5. RLS 策略
ALTER TABLE public.wechat_account_password_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_gallery_account_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_proxy_configs ENABLE ROW LEVEL SECURITY;

-- 允许管理员操作
CREATE POLICY "Admins can do everything on wechat_account_password_config" ON public.wechat_account_password_config
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can do everything on daily_gallery_account_passwords" ON public.daily_gallery_account_passwords
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can do everything on video_proxy_configs" ON public.video_proxy_configs
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 允许匿名用户（或已登录用户）根据 post_id 和 account_id 查询密码
-- 这里需要一个 RPC 或者策略来校验
CREATE POLICY "Anyone can select daily_gallery_account_passwords" ON public.daily_gallery_account_passwords
    FOR SELECT TO public USING (true);
