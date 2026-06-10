-- 创建小程序登录会话表
CREATE TABLE IF NOT EXISTS miniprogram_login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_code TEXT UNIQUE NOT NULL, -- 场景值，用于关联H5和小程序
    openid TEXT, -- 小程序用户openid
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 绑定的用户ID
    status TEXT NOT NULL DEFAULT 'pending'::public.item_status CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled')),
    action TEXT NOT NULL DEFAULT 'login' CHECK (action IN ('login', 'bind', 'register')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes') -- 会话有效期10分钟
);

-- 添加策略
ALTER TABLE miniprogram_login_sessions ENABLE ROW LEVEL SECURITY;

-- 允许匿名创建会话（H5端生成二维码）
CREATE POLICY "Allow anon to insert sessions" ON miniprogram_login_sessions
    FOR INSERT TO anon WITH CHECK (true);

-- 允许匿名查询会话（H5端轮询状态）
CREATE POLICY "Allow anon to select sessions" ON miniprogram_login_sessions
    FOR SELECT TO anon USING (true);

-- 允许匿名更新会话（小程序端更新状态）
CREATE POLICY "Allow anon to update sessions" ON miniprogram_login_sessions
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 在 users 表中添加微信 openid 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wechat_openid') THEN
        ALTER TABLE profiles ADD COLUMN wechat_openid TEXT;
    END IF;
END $$;
