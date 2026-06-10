-- 1. 扩展存储配置表以包含系统设置
ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS register_mode TEXT DEFAULT 'public', -- 'public' | 'invite'
ADD COLUMN IF NOT EXISTS force_login BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS anonymous_view_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS user_agreement TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS privacy_policy TEXT DEFAULT '';

-- 2. 扩展用户表以支持推荐关系
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 3. 创建兑换码表
CREATE TABLE IF NOT EXISTS redemption_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'register' | 'points' | 'group'
    value TEXT, -- 积分数值或权限组ID
    expires_at TIMESTAMPTZ,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 4. 创建广告管理表
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'splash' | 'waterfall' | 'popup'
    image_url TEXT,
    title TEXT,
    content TEXT,
    link TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    display_seconds INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 创建兑换记录表
CREATE TABLE IF NOT EXISTS redemption_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID REFERENCES redemption_codes(id),
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_logs ENABLE ROW LEVEL SECURITY;

-- 权限策略
CREATE POLICY "Admins have full access to redemption_codes" ON redemption_codes FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins have full access to ads" ON ads FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Public can view active ads" ON ads FOR SELECT USING (is_active = true AND (start_time IS NULL OR start_time <= NOW()) AND (end_time IS NULL OR end_time >= NOW()));
CREATE POLICY "Admins have full access to redemption_logs" ON redemption_logs FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can view their own redemption_logs" ON redemption_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 更新 profiles 的策略以允许读取推荐人
-- 已有的策略通常允许读取自己的。我们需要允许读取部分公开信息。
-- (假设已有对应的 public_profiles 视图或策略)
