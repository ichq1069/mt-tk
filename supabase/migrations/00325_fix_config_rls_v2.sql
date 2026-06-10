-- 1. 显式授予权限给 authenticated 和 service_role
GRANT ALL ON superbed_configs TO authenticated, service_role;
GRANT ALL ON debug_log_settings TO authenticated, service_role;

-- 2. 重构 superbed_configs 策略，使用直接查询以排除函数调用的潜在问题
ALTER TABLE superbed_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access to superbed_configs" ON superbed_configs;
DROP POLICY IF EXISTS "Authenticated users can read superbed_configs" ON superbed_configs;

-- 管理员全权限策略 (直接查询)
CREATE POLICY "Admins manage superbed_configs" ON superbed_configs
    FOR ALL
    TO authenticated, service_role
    USING (
        (auth.role() = 'service_role') OR 
        (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role))
    )
    WITH CHECK (
        (auth.role() = 'service_role') OR 
        (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role))
    );

-- 所有人可读策略 (用于读取配置)
CREATE POLICY "Allow public read on superbed_configs" ON superbed_configs
    FOR SELECT
    TO public
    USING (true);

-- 3. 重构 debug_log_settings 策略
ALTER TABLE debug_log_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access to debug_log_settings" ON debug_log_settings;
DROP POLICY IF EXISTS "Authenticated users can read debug_log_settings" ON debug_log_settings;

-- 管理员全权限策略 (直接查询)
CREATE POLICY "Admins manage debug_log_settings" ON debug_log_settings
    FOR ALL
    TO authenticated, service_role
    USING (
        (auth.role() = 'service_role') OR 
        (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role))
    )
    WITH CHECK (
        (auth.role() = 'service_role') OR 
        (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role))
    );

-- 所有人可读策略
CREATE POLICY "Allow public read on debug_log_settings" ON debug_log_settings
    FOR SELECT
    TO public
    USING (true);
