-- 创建系统健康检查 RPC 函数
CREATE OR REPLACE FUNCTION get_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_res jsonb;
    v_db_time timestamptz := now();
BEGIN
    SELECT jsonb_build_object(
        'status', 'healthy',
        'db_time', v_db_time,
        'stats', jsonb_build_object(
            'media_count', (SELECT count(*) FROM media_items),
            'profile_count', (SELECT count(*) FROM profiles),
            'log_count', (SELECT count(*) FROM admin_operation_logs),
            'config_count', (SELECT count(*) FROM system_configs)
        ),
        'extensions', (SELECT jsonb_agg(extname) FROM pg_extension)
    ) INTO v_res;
    RETURN v_res;
END;
$$;

-- 记录缓存命中的 RPC (如果不存在)
CREATE OR REPLACE FUNCTION record_cache_hit(p_cache_key text, p_is_hit boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO cache_stats (cache_key, is_hit, recorded_at)
    VALUES (p_cache_key, p_is_hit, now());
END;
$$;

-- 如果没有 cache_stats 表，创建它
CREATE TABLE IF NOT EXISTS cache_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key text NOT NULL,
    is_hit boolean NOT NULL,
    recorded_at timestamptz DEFAULT now()
);

-- 启用权限
GRANT ALL ON TABLE cache_stats TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION get_system_status TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION record_cache_hit TO anon, authenticated, service_role;
