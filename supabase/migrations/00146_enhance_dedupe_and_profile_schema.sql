-- 1. 为 album_photos 添加缺失的列
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS dedupe_error text;
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS dedupe_ignored boolean DEFAULT false;

-- 2. 创建查重日志表，存储查重历史
CREATE TABLE IF NOT EXISTS dedupe_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    scan_type text NOT NULL, -- 'md5', 'visual'
    processed_count int DEFAULT 0,
    duplicate_count int DEFAULT 0,
    scan_config jsonb,
    created_at timestamptz DEFAULT now(),
    duration_ms int,
    status text DEFAULT 'completed' -- 'completed', 'failed'
);

-- 3. 优化视觉查重算法 - 使用更好的聚类逻辑或相似性查找
-- 目前的 get_visually_duplicate_media 对于大规模数据可能会慢，但对于一般应用已足够
-- 我们提供一个更高效的查询具体重复项的函数

CREATE OR REPLACE FUNCTION get_visually_duplicate_media_v2(similarity_threshold int DEFAULT 5)
RETURNS TABLE (
    representative_hash text,
    item_ids uuid[],
    duplicate_count int,
    first_upload_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    WITH pairs AS (
        -- 找出所有相似的对
        SELECT 
            m1.id as id1, 
            m2.id as id2,
            m1.content_hash as h1,
            m1.created_at as t1
        FROM media_items m1
        JOIN media_items m2 ON m1.id < m2.id
        WHERE m1.content_hash IS NOT NULL 
          AND m2.content_hash IS NOT NULL
          AND m1.dedupe_ignored = false
          AND m2.dedupe_ignored = false
          AND hamming_distance(m1.content_hash, m2.content_hash) <= similarity_threshold
    ),
    grouped AS (
        -- 以第一个出现的 ID 作为代表进行聚合
        SELECT 
            id1,
            array_agg(id2) || id1 as ids,
            min(t1) as min_t,
            any_value(h1) as h -- any_value is not standard in postgres, use min
        FROM pairs
        GROUP BY id1
    )
    SELECT 
        min(h) as representative_hash, -- placeholder
        ids as item_ids,
        array_length(ids, 1) as duplicate_count,
        min_t as first_upload_at
    FROM grouped
    WHERE array_length(ids, 1) > 1;
END;
$$ LANGUAGE plpgsql;

-- 修正：any_value 替换
CREATE OR REPLACE FUNCTION get_visually_duplicate_media_v2(similarity_threshold int DEFAULT 5)
RETURNS TABLE (
    representative_hash text,
    item_ids uuid[],
    duplicate_count int,
    first_upload_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    WITH pairs AS (
        SELECT 
            m1.id as id1, 
            m2.id as id2,
            m1.content_hash as h1,
            m1.created_at as t1
        FROM media_items m1
        JOIN media_items m2 ON m1.id < m2.id
        WHERE m1.content_hash IS NOT NULL 
          AND m2.content_hash IS NOT NULL
          AND m1.dedupe_ignored = false
          AND m2.dedupe_ignored = false
          AND hamming_distance(m1.content_hash, m2.content_hash) <= similarity_threshold
    ),
    grouped AS (
        SELECT 
            id1,
            array_agg(id2) || id1 as ids,
            min(t1) as min_t,
            min(h1) as h
        FROM pairs
        GROUP BY id1
    )
    SELECT 
        h as representative_hash,
        ids as item_ids,
        array_length(ids, 1) as duplicate_count,
        min_t as first_upload_at
    FROM grouped;
END;
$$ LANGUAGE plpgsql;

-- 4. 查重数据统计函数
CREATE OR REPLACE FUNCTION get_dedupe_stats()
RETURNS jsonb AS $$
DECLARE
    v_total_media bigint;
    v_scanned_media bigint;
    v_duplicate_md5 bigint;
    v_duplicate_visual bigint;
BEGIN
    SELECT count(*) INTO v_total_media FROM media_items;
    SELECT count(*) INTO v_scanned_media FROM media_items WHERE content_hash IS NOT NULL;
    
    -- MD5 重复数
    SELECT count(*) - count(DISTINCT file_md5) INTO v_duplicate_md5 
    FROM media_items WHERE file_md5 IS NOT NULL;
    
    -- 视觉重复数 (粗略估计)
    SELECT count(*) INTO v_duplicate_visual 
    FROM (SELECT content_hash FROM media_items GROUP BY content_hash HAVING count(*) > 1) AS t;
    
    RETURN jsonb_build_object(
        'total', v_total_media,
        'scanned', v_scanned_media,
        'md5_duplicates', v_duplicate_md5,
        'visual_duplicates', v_duplicate_visual,
        'scanned_ratio', CASE WHEN v_total_media = 0 THEN 0 ELSE round(v_scanned_media::numeric / v_total_media * 100, 1) END
    );
END;
$$ LANGUAGE plpgsql;
