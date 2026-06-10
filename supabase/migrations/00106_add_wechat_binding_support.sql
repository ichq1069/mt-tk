-- 创建微信绑定请求表
CREATE TABLE IF NOT EXISTS public.wechat_binding_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    config_id UUID REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    openid TEXT,
    code TEXT NOT NULL,
    type TEXT NOT NULL, -- 'user_to_wechat' (H5生成) 或 'wechat_to_user' (微信生成)
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.wechat_binding_requests ENABLE ROW LEVEL SECURITY;

-- 允许用户读写自己的请求
CREATE POLICY "Users can manage their own binding requests" ON public.wechat_binding_requests
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- 允许匿名/公众号写入（微信回调中可能需要写入）
CREATE POLICY "Allow public insert for wechat_to_user" ON public.wechat_binding_requests
    FOR INSERT WITH CHECK (true);

-- 允许系统读取（用于验证）
CREATE POLICY "Allow read for binding validation" ON public.wechat_binding_requests
    FOR SELECT USING (true);

-- 在 profiles 中增加微信绑定信息 (可选，wechat_users 已经有了 user_id)
-- 确保 wechat_users 表允许更新 user_id
ALTER TABLE public.wechat_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow update for binding" ON public.wechat_users
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow select for binding" ON public.wechat_users
    FOR SELECT USING (true);
