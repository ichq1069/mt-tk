-- Re-create the get_duplicate_media RPC to be more robust
CREATE OR REPLACE FUNCTION public.get_duplicate_media()
 RETURNS TABLE(file_md5 text, duplicate_count bigint, first_upload_at timestamp with time zone, total_size bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.file_md5,
    COUNT(*)::BIGINT as duplicate_count,
    MIN(m.created_at) as first_upload_at,
    0::BIGINT as total_size
  FROM public.media_items m
  WHERE m.file_md5 IS NOT NULL 
    AND m.deleted_at IS NULL
    AND (m.dedupe_ignored IS NULL OR m.dedupe_ignored = FALSE)
  GROUP BY m.file_md5, m.dedupe_version
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$function$;

-- Also fix get_dedupe_stats to be absolutely sure
CREATE OR REPLACE FUNCTION public.get_dedupe_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
        SELECT mi.file_md5 
        FROM media_items mi
        WHERE mi.file_md5 IS NOT NULL AND mi.file_md5 != '' 
          AND mi.deleted_at IS NULL 
          AND (mi.dedupe_ignored IS NULL OR mi.dedupe_ignored = FALSE) 
        GROUP BY mi.file_md5, mi.dedupe_version 
        HAVING count(*) > 1
    ) AS t;
    
    -- 视觉重复项组数
    SELECT count(*) INTO v_duplicate_visual 
    FROM (
        SELECT mi.content_hash 
        FROM media_items mi
        WHERE mi.content_hash IS NOT NULL AND mi.content_hash != '' 
          AND mi.type = 'image' 
          AND mi.deleted_at IS NULL 
          AND (mi.dedupe_ignored IS NULL OR mi.dedupe_ignored = FALSE) 
        GROUP BY mi.content_hash, mi.dedupe_version 
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
$function$;