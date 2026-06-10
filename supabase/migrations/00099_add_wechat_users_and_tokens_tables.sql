-- 创建微信用户表
CREATE TABLE IF NOT EXISTS public.wechat_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
    openid TEXT NOT NULL,
    unionid TEXT,
    nickname TEXT,
    avatar_url TEXT,
    subscribe_status BOOLEAN DEFAULT false,
    subscribe_time TIMESTAMPTZ,
    unsubscribe_time TIMESTAMPTZ,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(openid, config_id)
);

-- 创建微信 access_token 缓存表
CREATE TABLE IF NOT EXISTS public.wechat_access_tokens (
    config_id UUID PRIMARY KEY REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建微信菜单配置表
CREATE TABLE IF NOT EXISTS public.wechat_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
    menu_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 设置权限
ALTER TABLE public.wechat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wechat_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wechat_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage wechat_users" ON public.wechat_users
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage wechat_access_tokens" ON public.wechat_access_tokens
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage wechat_menus" ON public.wechat_menus
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_wechat_users_openid ON public.wechat_users(openid);
CREATE INDEX IF NOT EXISTS idx_wechat_users_unionid ON public.wechat_users(unionid);
CREATE INDEX IF NOT EXISTS idx_wechat_users_user_id ON public.wechat_users(user_id);
