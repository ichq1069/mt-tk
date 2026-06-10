-- 首先删除旧策略
DROP POLICY IF EXISTS "Public read active domains" ON domain_configs;
DROP POLICY IF EXISTS "Admins full access" ON domain_configs;
DROP POLICY IF EXISTS "Admins have full access to domain_configs" ON domain_configs;
DROP POLICY IF EXISTS "Anyone can read active domain_configs" ON domain_configs;

-- 所有人可读已启用的域名 (SELECT)
CREATE POLICY "domain_configs_public_read"
ON domain_configs FOR SELECT
TO public
USING (is_active = true);

-- 管理员拥有所有权限 (ALL)
CREATE POLICY "domain_configs_admin_all"
ON domain_configs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
