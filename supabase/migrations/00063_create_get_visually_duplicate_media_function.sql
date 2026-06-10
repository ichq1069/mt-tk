-- 创建 RPC 函数获取视觉重复的媒体文件
CREATE OR REPLACE FUNCTION get_visually_duplicate_media()
RETURNS TABLE (
  content_hash TEXT,
  duplicate_count BIGINT,
  first_upload_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.content_hash,
    COUNT(*)::BIGINT as duplicate_count,
    MIN(m.created_at) as first_upload_at
  FROM media_items m
  WHERE m.content_hash IS NOT NULL
  GROUP BY m.content_hash
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;