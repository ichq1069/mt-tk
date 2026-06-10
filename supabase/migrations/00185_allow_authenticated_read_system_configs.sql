CREATE POLICY "Authenticated users can read system_configs" ON system_configs
FOR SELECT TO authenticated
USING (true);