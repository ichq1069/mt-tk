CREATE OR REPLACE FUNCTION get_dedupe_stats()
RETURNS jsonb AS $$
DECLARE
    v_total_media bigint;
    v_scanned_media bigint;
    v_duplicate_md5 bigint;
    v_duplicate_visual bigint;
BEGIN
    -- 总非删除媒体数
    SELECT count(*) INTO v_total_media FROM media_items WHERE deleted_at IS NULL;
    
    -- 已扫描图片数
    SELECT count(*) INTO v_scanned_media 
    FROM media_items 
    WHERE content_hash IS NOT NULL AND content_hash != '' 
      AND type = 'image' 
      AND deleted_at IS NULL;
    
    -- MD5 重复组数
    SELECT count(*) INTO v_duplicate_md5 
    FROM (
        SELECT file_md5 
        FROM media_items 
        WHERE file_md5 IS NOT NULL 
          AND deleted_at IS NULL 
          AND (dedupe_ignored IS NULL OR dedupe_ignored = FALSE) 
        GROUP BY file_md5, dedupe_version 
        HAVING count(*) > 1
    ) AS t;
    
    -- 视觉重复项组数 (精确一点，至少按 GROUP BY 但要有相同过滤)
    SELECT count(*) INTO v_duplicate_visual 
    FROM (
        SELECT content_hash 
        FROM media_items 
        WHERE content_hash IS NOT NULL AND content_hash != '' 
          AND type = 'image' 
          AND deleted_at IS NULL 
          AND (dedupe_ignored IS NULL OR dedupe_ignored = FALSE) 
        GROUP BY content_hash, dedupe_version 
        HAVING count(*) > 1
    ) AS t;
    
    RETURN jsonb_build_object(
        'total', v_total_media,
        'scanned', v_scanned_media,
        'md5_duplicates', v_duplicate_md5,
        'visual_duplicates', v_duplicate_visual,
        'scanned_ratio', CASE WHEN v_total_media = 0 THEN 0 ELSE round(v_scanned_media::numeric / v_total_media * 100, 1) END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
