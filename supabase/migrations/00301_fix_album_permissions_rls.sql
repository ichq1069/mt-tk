-- 更新 album_user_permissions 表的 RLS 策略，使用 is_admin 函数
DROP POLICY IF EXISTS "Admins can manage album permissions" ON album_user_permissions;
CREATE POLICY "Admins can manage album permissions" ON album_user_permissions
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- 确保用户可以查看自己的权限
DROP POLICY IF EXISTS "Users can view their own album permissions" ON album_user_permissions;
CREATE POLICY "Users can view their own album permissions" ON album_user_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
