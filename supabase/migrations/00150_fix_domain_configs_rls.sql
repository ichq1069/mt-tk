-- 删除已有的域名配置策略
DROP POLICY IF EXISTS "Admins have full access to domain_configs" ON domain_configs;
DROP POLICY IF EXISTS "Anyone can read active domain_configs" ON domain_configs;

-- 允许所有人读取已启用的域名配置 (用于 Edge Functions 和 站点识别)
CREATE POLICY "Public read active domains"
ON domain_configs FOR SELECT
TO public
USING (is_active = true);

-- 允许管理员执行所有操作 (用于 后台管理)
CREATE POLICY "Admins full access"
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
