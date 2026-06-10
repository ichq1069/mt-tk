-- 创建随机密码/特权密码表
CREATE TABLE IF NOT EXISTS daily_gallery_special_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password TEXT NOT NULL UNIQUE,
  target_date DATE, -- NULL 表示通用，不限日期
  is_one_time BOOLEAN DEFAULT TRUE,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  created_by UUID
);

-- 开启 RLS
ALTER TABLE daily_gallery_special_passwords ENABLE ROW LEVEL SECURITY;

-- 只有管理员可以执行所有操作
-- 由于 user_role 枚举可能不在这个迁移上下文中定义，我们用 text 比较
CREATE POLICY "Admins can manage special passwords" ON daily_gallery_special_passwords
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role::text = 'admin'
    )
  );
