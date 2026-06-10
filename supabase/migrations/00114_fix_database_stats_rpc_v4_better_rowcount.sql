-- 更新 get_database_stats 函数，确保 row_count 始终为非负
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    table_name TEXT,
    description TEXT,
    row_count BIGINT,
    total_size TEXT,
    data_size TEXT,
    index_size TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT AS table_name,
        CASE 
            WHEN c.relname = 'profiles' THEN '用户资料与角色权限'::TEXT
            WHEN c.relname = 'media_items' THEN '视觉内容/媒体资源库'::TEXT
            WHEN c.relname = 'favorites' THEN '用户收藏关联表'::TEXT
            WHEN c.relname = 'notifications' THEN '系统与业务消息通知'::TEXT
            WHEN c.relname = 'points_logs' THEN '积分变动历史明细'::TEXT
            WHEN c.relname = 'system_configs' THEN '全站核心功能开关配置'::TEXT
            WHEN c.relname = 'wechat_fans' THEN '公众号关注粉丝数据'::TEXT
            WHEN c.relname = 'wechat_users' THEN '平台用户与微信OpenID绑定关系'::TEXT
            WHEN c.relname = 'permission_groups' THEN '细粒度功能权限分组'::TEXT
            ELSE ''::TEXT
        END AS description,
        (CASE WHEN c.reltuples < 0 THEN 0 ELSE c.reltuples END)::BIGINT AS row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS data_size,
        pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS index_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' 
      AND n.nspname = 'public'
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT LIKE 'sql_%'
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;
