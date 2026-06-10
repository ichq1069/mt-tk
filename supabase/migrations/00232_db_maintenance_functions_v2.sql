-- 删除旧函数并重新创建
DROP FUNCTION IF EXISTS public.get_database_stats();

-- RPC: exec_sql 执行动态 SQL
CREATE OR REPLACE FUNCTION public.exec_sql(query_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    EXECUTE query_text;
END;
$$;

-- 获取数据库统计信息的函数
CREATE OR REPLACE FUNCTION public.get_database_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    table_count int;
    row_count bigint;
    db_size text;
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

    result := jsonb_build_object(
        'table_count', table_count,
        'row_count', row_count,
        'db_size', db_size,
        'stats_at', now()
    );

    RETURN result;
END;
$$;

-- 索引：exclude_from_daily_gallery
CREATE INDEX IF NOT EXISTS idx_media_items_exclude_gallery ON public.media_items (exclude_from_daily_gallery) WHERE (exclude_from_daily_gallery = true);

-- 索引：tags (gin) 已存在，此处保持幂等
CREATE INDEX IF NOT EXISTS idx_media_items_tags ON public.media_items USING gin (tags);
