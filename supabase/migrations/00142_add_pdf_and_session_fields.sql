-- 为 photo_albums 增加 PDF 链接字段
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS pdf_urls JSONB DEFAULT '{}'::jsonb;

-- 为 storage_configs 增加单设备登录限制
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS single_device_login BOOLEAN DEFAULT FALSE;

-- 为 profiles 增加最后 Session ID 用于单设备登录限制
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_session_id TEXT;

-- 确保 user_visit_stats 表权限正确 (匿名也可以记录访客)
ALTER TABLE user_visit_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can insert visit stats" ON user_visit_stats;
CREATE POLICY "Anon can insert visit stats" ON user_visit_stats FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can view visit stats" ON user_visit_stats;
CREATE POLICY "Admin can view visit stats" ON user_visit_stats FOR SELECT TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
