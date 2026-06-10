-- 为管理员添加资源访问日志的删除权限
CREATE POLICY "Admins can delete daily_gallery_access_logs"
ON daily_gallery_access_logs
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- 为管理员添加登录流水的删除权限
CREATE POLICY "Admins can delete mp_login_logs"
ON mp_login_logs
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));
