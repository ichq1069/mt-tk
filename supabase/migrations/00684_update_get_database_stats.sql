-- Update get_database_stats to be more comprehensive
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_rows BIGINT;
    v_table_size TEXT;
    v_index_size TEXT;
    v_dead_rows BIGINT;
    v_all_stats json;
BEGIN
    -- Legacy support for media_items
    SELECT count(*) INTO v_total_rows FROM media_items;
    SELECT pg_size_pretty(pg_total_relation_size('media_items')) INTO v_table_size;
    SELECT pg_size_pretty(pg_indexes_size('media_items')) INTO v_index_size;
    
    SELECT n_dead_tup INTO v_dead_rows 
    FROM pg_stat_user_tables 
    WHERE relname = 'media_items';

    -- Comprehensive stats
    SELECT json_agg(t) INTO v_all_stats
    FROM (
        SELECT 
            relname AS table_name,
            n_live_tup AS row_count,
            pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
            pg_size_pretty(pg_relation_size(relid)) AS table_size,
            pg_size_pretty(pg_indexes_size(relid)) AS index_size,
            n_dead_tup AS dead_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
    ) t;

    RETURN json_build_object(
        'media_items_rows', v_total_rows,
        'table_size', v_table_size,
        'index_size', v_index_size,
        'dead_rows', COALESCE(v_dead_rows, 0),
        'table_stats', v_all_stats,
        'database_size', pg_size_pretty(pg_database_size(current_database()))
    );
END;
$$;
