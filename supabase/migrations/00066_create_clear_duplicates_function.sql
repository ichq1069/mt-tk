-- 创建 RPC 函数一键清理重复项 (MD5 层面)
CREATE OR REPLACE FUNCTION clear_all_duplicate_media()
RETURNS TABLE (
  deleted_count BIGINT,
  saved_space_estimate TEXT
) AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  -- 删除除了最早上传的副本以外的所有具有相同 MD5 的项
  WITH to_delete AS (
    SELECT id
    FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER(PARTITION BY file_md5 ORDER BY created_at ASC) as rn
      FROM media_items
      WHERE file_md5 IS NOT NULL
    ) t
    WHERE t.rn > 1
  )
  DELETE FROM media_items
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count, '清理完成';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;