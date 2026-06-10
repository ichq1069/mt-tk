-- 1. 确保 RLS 已启用 (即使之前查询显示为 false，也显式启用一次)
ALTER TABLE superbed_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_log_settings ENABLE ROW LEVEL SECURITY;

-- 2. 删除旧策略 (以防万一)
DROP POLICY IF EXISTS "Admins have full access to superbed_configs" ON superbed_configs;
DROP POLICY IF EXISTS "Authenticated users can read superbed_configs" ON superbed_configs;
DROP POLICY IF EXISTS "Admins have full access to debug_log_settings" ON debug_log_settings;
DROP POLICY IF EXISTS "Authenticated users can read debug_log_settings" ON debug_log_settings;

-- 3. 创建新策略
-- 管理员拥有所有权限 (INSERT, UPDATE, DELETE, SELECT)
CREATE POLICY "Admins have full access to superbed_configs" ON superbed_configs
    FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- 认证用户可以查看 (SELECT)
CREATE POLICY "Authenticated users can read superbed_configs" ON superbed_configs
    FOR SELECT
    TO authenticated
    USING (true);

-- 管理员拥有所有权限 (INSERT, UPDATE, DELETE, SELECT)
CREATE POLICY "Admins have full access to debug_log_settings" ON debug_log_settings
    FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- 认证用户可以查看 (SELECT)
CREATE POLICY "Authenticated users can read debug_log_settings" ON debug_log_settings
    FOR SELECT
    TO authenticated
    USING (true);
