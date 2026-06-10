DROP FUNCTION IF EXISTS get_database_stats();
DROP FUNCTION IF EXISTS exec_sql(text);

-- 为查重提供更安全的批量更新函数
CREATE OR REPLACE FUNCTION bulk_ignore_dedupe(p_ids UUID[])
RETURNS void AS $$
BEGIN
    -- 这里通过更新操作直接修改字段，不再通过 upsert (避免 user_id not null 错误)
    -- 并利用 row_number 给每个 ID 分配不同的递增 dedupe_version 确保物理指纹互斥
    UPDATE media_items m
    SET dedupe_ignored = true,
        dedupe_version = floor(extract(epoch from now()))::bigint + sub.rn
    FROM (
        SELECT id, row_number() OVER () as rn
        FROM unnest(p_ids) as id
    ) as sub
    WHERE m.id = sub.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 数据库统计函数 (用于优化面板)
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS JSON AS $$
DECLARE
    v_total_rows BIGINT;
    v_table_size TEXT;
    v_index_size TEXT;
    v_dead_rows BIGINT;
BEGIN
    SELECT count(*) INTO v_total_rows FROM media_items;
    SELECT pg_size_pretty(pg_total_relation_size('media_items')) INTO v_table_size;
    SELECT pg_size_pretty(pg_indexes_size('media_items')) INTO v_index_size;
    
    SELECT n_dead_tup INTO v_dead_rows 
    FROM pg_stat_user_tables 
    WHERE relname = 'media_items';

    RETURN json_build_object(
        'media_items_rows', v_total_rows,
        'table_size', v_table_size,
        'index_size', v_index_size,
        'dead_rows', COALESCE(v_dead_rows, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 通用 SQL 执行函数 (限管理员，由 Edge Function 调用)
CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE query_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
