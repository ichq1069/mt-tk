ALTER TABLE proxy_cache_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to proxy_cache_items" ON proxy_cache_items
FOR ALL TO authenticated
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

-- 允许所有通过 RPC 调用的录入（RPC 使用 SECURITY DEFINER，所以其实不用专门为 Anon 开启 INSERT）
-- 但如果以后直接通过客户端调用，可能需要。目前保持 SECURITY DEFINER 即可。
