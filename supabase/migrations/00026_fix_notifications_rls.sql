-- 简化策略，确保管理员和用户都能查到相关内容
DROP POLICY IF EXISTS "Users can view relevant notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- 所有人（登录后）能看全站通知
CREATE POLICY "View public notifications" ON notifications 
  FOR SELECT USING (user_id IS NULL AND role_id IS NULL AND auth.uid() IS NOT NULL);

-- 用户能看自己的通知
CREATE POLICY "View personal notifications" ON notifications 
  FOR SELECT USING (user_id = auth.uid());

-- 用户能看自己角色的通知 (这里我们用更简单的方式，避免深层递归)
CREATE POLICY "View role notifications" ON notifications 
  FOR SELECT USING (
    role_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM user_permissions 
      WHERE user_id = auth.uid() 
      AND group_name IN (SELECT name FROM permission_groups WHERE id = notifications.role_id)
    )
  );

-- 管理员能看和管理全部
CREATE POLICY "Admin full access" ON notifications 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 用户可以更新自己的已读状态
CREATE POLICY "Update self read status" ON notifications 
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
