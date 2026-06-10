-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL 表示全站通知
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'system', -- 'audit', 'system', 'admin'
  link TEXT, 
  link_type TEXT DEFAULT 'internal', -- 'internal', 'external'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的通知或全站通知
CREATE POLICY "Users can view their own or public notifications" ON notifications
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

-- 允许用户标记自己的通知为已读
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid() OR (user_id IS NULL AND auth.uid() IS NOT NULL));

-- 允许管理员管理所有通知
CREATE POLICY "Admins can manage notifications" ON notifications
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 更新存储配置表，增加禁止微信访问字段
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS wechat_forbidden BOOLEAN DEFAULT FALSE;
