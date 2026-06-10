-- 为 storage_configs 增加微信登录和绑定开关
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS wechat_login_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS wechat_binding_enabled BOOLEAN DEFAULT true;

-- 增加数据库统计函数
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT count(*) FROM profiles),
        'total_media', (SELECT count(*) FROM media_items WHERE deleted_at IS NULL),
        'pending_media', (SELECT count(*) FROM media_items WHERE status::public.item_status = 'pending'::public.item_status AND deleted_at IS NULL),
        'total_views', (SELECT coalesce(sum(view_count), 0) FROM media_items),
        'total_favorites', (SELECT count(*) FROM favorites),
        'wechat_fans', (SELECT count(*) FROM wechat_fans),
        'db_size', (SELECT pg_size_pretty(pg_database_size(current_database())))
    ) INTO result;
    RETURN result;
END;
$$;
