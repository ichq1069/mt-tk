DROP POLICY IF EXISTS "管理员可全权管理短代码" ON shortcodes;
CREATE POLICY "管理员可全权管理短代码" ON shortcodes
FOR ALL
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "所有人可读已启用的短代码" ON shortcodes;
CREATE POLICY "所有人可读已启用的短代码" ON shortcodes
FOR SELECT
USING (is_active = true);