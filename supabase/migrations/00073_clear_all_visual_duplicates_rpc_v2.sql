CREATE OR REPLACE FUNCTION public.clear_all_visual_duplicates()
 RETURNS TABLE(deleted_count bigint, saved_space_estimate text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  -- 删除除了最早上传的副本以外的所有具有相同 content_hash 的项
  -- 仅针对图片 (type = 'image') 且指纹不为空的情况
  WITH to_delete AS (
    SELECT id
    FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER(PARTITION BY content_hash ORDER BY created_at ASC) as rn
      FROM media_items
      WHERE content_hash IS NOT NULL AND type = 'image'
    ) t
    WHERE t.rn > 1
  )
  DELETE FROM media_items
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count, '清理完成';
END;
$function$;
