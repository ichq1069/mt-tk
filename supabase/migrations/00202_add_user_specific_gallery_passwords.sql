-- 创建用户特定密码表
CREATE TABLE IF NOT EXISTS daily_gallery_user_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid TEXT NOT NULL,
  post_date DATE NOT NULL,
  password TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(openid, post_date)
);

-- 添加 RLS 策略 (公开读取以便验证)
ALTER TABLE daily_gallery_user_passwords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select for verification" ON daily_gallery_user_passwords FOR SELECT TO anon, authenticated USING (TRUE);
