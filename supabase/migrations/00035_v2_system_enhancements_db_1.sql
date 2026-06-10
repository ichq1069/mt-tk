-- 扩展存储配置
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS register_mode TEXT DEFAULT 'public'; -- 'public' | 'invite'
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS force_login BOOLEAN DEFAULT false;
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS anonymous_view_limit INTEGER DEFAULT 5;
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS user_agreement TEXT DEFAULT '';
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS privacy_policy TEXT DEFAULT '';

-- 推荐人系统
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);

-- 兑换码表
CREATE TABLE IF NOT EXISTS redemption_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'invite' | 'points' | 'group'
    value TEXT, -- 积分数值或权限组ID
    expires_at TIMESTAMPTZ,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 兑换记录
CREATE TABLE IF NOT EXISTS redemption_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID REFERENCES redemption_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(code_id, user_id)
);

-- 广告表
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

-- 启用 RLS
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- 策略
DROP POLICY IF EXISTS "Admins have full access to redemption_codes" ON redemption_codes;
CREATE POLICY "Admins have full access to redemption_codes" ON redemption_codes
    FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to redemption_logs" ON redemption_logs;
CREATE POLICY "Admins have full access to redemption_logs" ON redemption_logs
    FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read their own redemption_logs" ON redemption_logs;
CREATE POLICY "Users can read their own redemption_logs" ON redemption_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to ads" ON ads;
CREATE POLICY "Admins have full access to ads" ON ads
    FOR ALL TO authenticated USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Everyone can view active ads" ON ads;
CREATE POLICY "Everyone can view active ads" ON ads
    FOR SELECT USING (is_active = true AND (start_time IS NULL OR start_time <= NOW()) AND (end_time IS NULL OR end_time >= NOW()));
