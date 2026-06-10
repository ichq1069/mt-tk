-- 先移除之前刚添加的可能不精确的策略
DROP POLICY IF EXISTS "Admins can delete daily_gallery_access_logs" ON daily_gallery_access_logs;
DROP POLICY IF EXISTS "Admins can delete mp_login_logs" ON mp_login_logs;

-- 使用 is_admin 函数添加更稳健的删除策略
CREATE POLICY "Admins can delete daily_gallery_access_logs"
ON daily_gallery_access_logs
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete mp_login_logs"
ON mp_login_logs
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
