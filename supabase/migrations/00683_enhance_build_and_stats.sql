-- Add env_config to system_builds
ALTER TABLE system_builds ADD COLUMN env_config text;

-- Create comprehensive system stats function
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_table_stats json;
    v_db_size text;
    v_stats json;
BEGIN
    -- Get size and row count for all user tables in public schema
    SELECT json_agg(t) INTO v_table_stats
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

    -- Get total database size
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO v_db_size;

    -- Construct final JSON
    v_stats := json_build_object(
        'database_size', v_db_size,
        'table_stats', v_table_stats,
        'timestamp', now()
    );

    RETURN v_stats;
END;
$$;
