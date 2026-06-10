-- 创建微信粉丝表
CREATE TABLE IF NOT EXISTS public.wechat_fans (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    config_id UUID REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
    openid TEXT NOT NULL,
    nickname TEXT,
    avatar_url TEXT,
    sex INTEGER, -- 1:男, 2:女, 0:未知
    city TEXT,
    province TEXT,
    country TEXT,
    subscribe_time TIMESTAMP WITH TIME ZONE,
    remark TEXT,
    groupid INTEGER,
    tagid_list JSONB,
    subscribe_scene TEXT,
    qr_scene TEXT,
    qr_scene_str TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(config_id, openid)
);

-- 启用 RLS
ALTER TABLE public.wechat_fans ENABLE ROW LEVEL SECURITY;

-- 管理员权限
CREATE POLICY "Admin full access on wechat_fans" ON public.wechat_fans
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.wechat_fans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 允许实时更新
ALTER PUBLICATION supabase_realtime ADD TABLE public.wechat_fans;
