-- 1. 更新 superbed_configs 策略
ALTER TABLE superbed_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage superbed_configs" ON superbed_configs;
DROP POLICY IF EXISTS "Allow public read on superbed_configs" ON superbed_configs;

CREATE POLICY "Admins manage superbed_configs" ON superbed_configs
    FOR ALL
    TO authenticated, service_role
    USING (
        (auth.role() = 'service_role') OR 
        (EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() 
            AND (p.role = 'admin'::user_role OR (g.permissions ? 'admin_storage'))
        ))
    )
    WITH CHECK (
        (auth.role() = 'service_role') OR 
        (EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() 
            AND (p.role = 'admin'::user_role OR (g.permissions ? 'admin_storage'))
        ))
    );

CREATE POLICY "Allow public read on superbed_configs" ON superbed_configs
    FOR SELECT
    TO public
    USING (true);

-- 2. 更新 debug_log_settings 策略
ALTER TABLE debug_log_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage debug_log_settings" ON debug_log_settings;
DROP POLICY IF EXISTS "Allow public read on debug_log_settings" ON debug_log_settings;

CREATE POLICY "Admins manage debug_log_settings" ON debug_log_settings
    FOR ALL
    TO authenticated, service_role
    USING (
        (auth.role() = 'service_role') OR 
        (EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() 
            AND (p.role = 'admin'::user_role OR (g.permissions ? 'admin_storage'))
        ))
    )
    WITH CHECK (
        (auth.role() = 'service_role') OR 
        (EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() 
            AND (p.role = 'admin'::user_role OR (g.permissions ? 'admin_storage'))
        ))
    );

CREATE POLICY "Allow public read on debug_log_settings" ON debug_log_settings
    FOR SELECT
    TO public
    USING (true);

-- 3. 更新 storage_configs 策略
ALTER TABLE storage_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage storage_configs" ON storage_configs;
DROP POLICY IF EXISTS "Allow public read on storage_configs" ON storage_configs;

CREATE POLICY "Admins manage storage_configs" ON storage_configs
    FOR ALL
    TO authenticated, service_role
    USING (
        (auth.role() = 'service_role') OR 
        (EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() 
            AND (p.role = 'admin'::user_role OR (g.permissions ? 'admin_storage'))
        ))
    )
    WITH CHECK (
        (auth.role() = 'service_role') OR 
        (EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() 
            AND (p.role = 'admin'::user_role OR (g.permissions ? 'admin_storage'))
        ))
    );

CREATE POLICY "Allow public read on storage_configs" ON storage_configs
    FOR SELECT
    TO public
    USING (true);

-- 4. 更新 system_configs 策略
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage system_configs" ON system_configs;
DROP POLICY IF EXISTS "Allow public read on system_configs" ON system_configs;

CREATE POLICY "Admins manage system_configs" ON system_configs
    FOR ALL
    TO authenticated, service_role
    USING (
        (auth.role() = 'service_role') OR 
        (EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() 
            AND (p.role = 'admin'::user_role OR (g.permissions ? 'admin_storage'))
        ))
    )
    WITH CHECK (
        (auth.role() = 'service_role') OR 
        (EXISTS (
            SELECT 1 FROM profiles p
            LEFT JOIN permission_groups g ON p.group_id = g.id
            WHERE p.id = auth.uid() 
            AND (p.role = 'admin'::user_role OR (g.permissions ? 'admin_storage'))
        ))
    );

CREATE POLICY "Allow public read on system_configs" ON system_configs
    FOR SELECT
    TO public
    USING (true);
