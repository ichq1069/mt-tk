CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS jsonb AS $$
DECLARE
    table_count int;
    row_count bigint;
    db_size text;
    tables jsonb;
    result jsonb;
BEGIN
    -- 获取表数量
    SELECT count(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public';

    -- 获取总行数（估算值，提升性能）
    SELECT sum(reltuples)::bigint INTO row_count 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r';

    -- 获取数据库总大小
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;

    -- 获取具体的表统计信息
    SELECT jsonb_agg(t) INTO tables FROM (
        SELECT 
            c.relname as table_name,
            n.nspname as schema_name,
            c.reltuples::bigint as row_count,
            pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
            pg_size_pretty(pg_relation_size(c.oid)) as data_size,
            pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) as index_size
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY pg_total_relation_size(c.oid) DESC
    ) t;

    result := jsonb_build_object(
        'table_count', table_count,
        'row_count', row_count,
        'db_size', db_size,
        'tables', tables,
        'stats_at', now()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;
