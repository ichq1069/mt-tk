-- 创建 RPC 函数获取重复的媒体文件
CREATE OR REPLACE FUNCTION get_duplicate_media()
RETURNS TABLE (
  file_md5 TEXT,
  duplicate_count BIGINT,
  first_upload_at TIMESTAMP WITH TIME ZONE,
  total_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.file_md5,
    COUNT(*)::BIGINT as duplicate_count,
    MIN(m.created_at) as first_upload_at,
    0::BIGINT as total_size  -- 占位符，实际大小需要从存储中获取
  FROM media_items m
  WHERE m.file_md5 IS NOT NULL
  GROUP BY m.file_md5
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;