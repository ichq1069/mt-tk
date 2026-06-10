-- 1. 增加兑换次数
CREATE OR REPLACE FUNCTION increment_redemption_use(code_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE redemption_codes
    SET used_count = used_count + 1
    WHERE id = code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 获取表统计信息
CREATE OR REPLACE FUNCTION get_database_table_stats()
RETURNS TABLE (
    table_name TEXT,
    description TEXT,
    row_count BIGINT,
    total_size TEXT,
    index_size TEXT,
    data_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT AS table_name,
        obj_description(c.oid, 'pg_class')::TEXT AS description,
        COALESCE(s.n_live_tup, 0) AS row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS data_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE c.relkind = 'r' 
      AND n.nspname = 'public'
      AND c.relname NOT LIKE 'pg_%'
    ORDER BY s.n_live_tup DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 优化表
CREATE OR REPLACE FUNCTION optimize_database_table(table_name_input TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
    IF table_name_input IS NOT NULL THEN
        -- 使用 ANALYZE，VACUUM 需要事务外执行或通过特定方式
        EXECUTE format('ANALYZE public.%I', table_name_input);
        RETURN 'ANALYZE performed on table ' || table_name_input;
    ELSE
        ANALYZE;
        RETURN 'ANALYZE performed on all tables';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 权限给 authenticated/service_role
GRANT EXECUTE ON FUNCTION increment_redemption_use(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_database_table(TEXT) TO authenticated;

-- 设置部分表的描述以供展示
COMMENT ON TABLE profiles IS '用户资料与核心账户表';
COMMENT ON TABLE media_items IS '媒体资源(图文/视频)表';
COMMENT ON TABLE favorites IS '用户收藏夹';
COMMENT ON TABLE redemption_codes IS '兑换码与邀请码库';
COMMENT ON TABLE storage_configs IS '全站系统配置';
COMMENT ON TABLE notifications IS '消息通知系统';
COMMENT ON TABLE ads IS '广告与推广位管理';
COMMENT ON TABLE points_logs IS '用户积分变动日志';
COMMENT ON TABLE check_ins IS '用户签到记录';
COMMENT ON TABLE user_field_configs IS '用户自定义字段配置';
