-- 1. 修复角色访问权限
grant usage on schema public to anon, authenticated;
-- 不要使用 all tables，因为可能包含私有表，我们要显式控制
grant select on storage_configs to anon, authenticated;
grant select on system_configs to anon, authenticated;
grant select on media_items to anon, authenticated;
grant select on profiles to anon, authenticated;
grant select on tags to anon, authenticated;
grant select on media_tags to anon, authenticated;
grant select on content_categories to anon, authenticated;

-- 2. 授权函数执行权限
grant execute on function get_optimized_media_items_v3 to anon, authenticated;
grant execute on function get_tag_cloud_stats to anon, authenticated;
grant execute on function record_cache_hit to anon, authenticated;
grant execute on function upsert_user_visit_stats to anon, authenticated;

-- 3. 修复 RLS 策略 (确保 anon 角色包含在内)
DO $$ 
BEGIN
    -- storage_configs
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'storage_configs') THEN
        ALTER TABLE storage_configs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow anon read on storage_configs" ON storage_configs;
        CREATE POLICY "Allow anon read on storage_configs" ON storage_configs FOR SELECT TO anon USING (true);
    END IF;

    -- system_configs
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_configs') THEN
        ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow anon read on system_configs" ON system_configs;
        CREATE POLICY "Allow anon read on system_configs" ON system_configs FOR SELECT TO anon USING (true);
    END IF;
END $$;

-- 4. 修复发布 (仅添加缺失的表)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'storage_configs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE storage_configs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    END IF;
END $$;
