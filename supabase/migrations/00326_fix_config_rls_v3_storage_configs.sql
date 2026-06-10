-- 更新 storage_configs 策略为直接查询
ALTER TABLE storage_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access to storage_configs" ON storage_configs;
DROP POLICY IF EXISTS "Public Read" ON storage_configs;

-- 管理员全权限策略 (直接查询)
CREATE POLICY "Admins manage storage_configs" ON storage_configs
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
CREATE POLICY "Allow public read on storage_configs" ON storage_configs
    FOR SELECT
    TO public
    USING (true);
