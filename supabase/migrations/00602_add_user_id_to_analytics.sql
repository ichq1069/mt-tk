-- 为 analytics_visitors 添加 user_id 和 openid 字段
ALTER TABLE analytics_visitors
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS openid TEXT;

CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON analytics_visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_openid ON analytics_visitors(openid);

-- 为 analytics_sessions 添加 user_id 和 openid 字段
ALTER TABLE analytics_sessions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS openid TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_openid ON analytics_sessions(openid);