-- 更新通知表，增加权限组通知支持
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES permission_groups(id) ON DELETE CASCADE;

-- 创建用户信息自定义字段配置表
CREATE TABLE IF NOT EXISTS user_field_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_key TEXT NOT NULL UNIQUE, -- 字段标识
  field_name TEXT NOT NULL,       -- 字段显示名称
  field_type TEXT DEFAULT 'text', -- text, number, select, date, etc.
  placeholder TEXT,
  options JSONB,                  -- 如果是 select 类型的选项
  is_active BOOLEAN DEFAULT TRUE,
  is_required BOOLEAN DEFAULT FALSE,
  is_searchable BOOLEAN DEFAULT FALSE,
  show_in_profile BOOLEAN DEFAULT TRUE,  -- 是否在个人资料页显示
  show_in_center BOOLEAN DEFAULT TRUE,   -- 是否在用户中心显示
  show_in_register BOOLEAN DEFAULT FALSE, -- 是否在注册页显示
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE user_field_configs ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看启用的字段配置
CREATE POLICY "Anyone can view active field configs" ON user_field_configs
  FOR SELECT USING (is_active = TRUE);

-- 允许管理员管理字段配置
CREATE POLICY "Admins can manage field configs" ON user_field_configs
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 插入一些初始字段
INSERT INTO user_field_configs (field_key, field_name, field_type, sort_order)
VALUES 
('phone', '手机号', 'text', 1),
('bio', '个人简介', 'textarea', 2),
('location', '所在地', 'text', 3)
ON CONFLICT (field_key) DO NOTHING;

-- 修改获取通知的逻辑
DROP POLICY IF EXISTS "Users can view their own or public notifications" ON notifications;
CREATE POLICY "Users can view relevant notifications" ON notifications
  FOR SELECT USING (
    user_id IS NULL AND role_id IS NULL -- 全站
    OR user_id = auth.uid()             -- 个人
    OR role_id IN (
      SELECT id FROM permission_groups 
      WHERE name IN (SELECT group_name FROM user_permissions WHERE user_id = auth.uid())
    ) -- 角色组
  );
