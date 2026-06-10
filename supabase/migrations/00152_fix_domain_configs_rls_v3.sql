-- 首先删除旧策略
DROP POLICY IF EXISTS "domain_configs_public_read" ON domain_configs;
DROP POLICY IF EXISTS "domain_configs_admin_all" ON domain_configs;
DROP POLICY IF EXISTS "Public read active domains" ON domain_configs;
DROP POLICY IF EXISTS "Admins full access" ON domain_configs;
DROP POLICY IF EXISTS "Admins have full access to domain_configs" ON domain_configs;
DROP POLICY IF EXISTS "Anyone can read active domain_configs" ON domain_configs;

-- 所有人可读已启用的域名 (SELECT)
CREATE POLICY "domain_configs_select_public"
ON domain_configs FOR SELECT
TO public
USING (is_active = true);

-- 所有人可读所有域名 (SELECT) - 暂时允许所有人读所有记录，以便定位问题
-- 其实更好的做法是允许所有 authenticated 用户读取
CREATE POLICY "domain_configs_select_authenticated"
ON domain_configs FOR SELECT
TO authenticated
USING (true);

-- 管理员可读写所有记录 (ALL)
CREATE POLICY "domain_configs_admin_all_v2"
ON domain_configs FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
