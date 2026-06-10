-- 创建 RPC 函数获取唯一（去重后的）媒体文件列表
CREATE OR REPLACE FUNCTION get_unique_media_items(p_limit INT, p_offset INT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  url TEXT,
  type TEXT,
  status TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  file_md5 TEXT,
  content_hash TEXT,
  username TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_items AS (
    SELECT 
      m.*,
      p.username,
      ROW_NUMBER() OVER(
        PARTITION BY COALESCE(m.file_md5, m.id::text) 
        ORDER BY m.created_at ASC
      ) as rn_md5,
      ROW_NUMBER() OVER(
        PARTITION BY COALESCE(m.content_hash, m.id::text) 
        ORDER BY m.created_at ASC
      ) as rn_visual
    FROM media_items m
    LEFT JOIN profiles p ON m.user_id = p.id
  )
  SELECT 
    r.id, r.user_id, r.url, r.type, r.status::text, r.title, r.created_at, r.file_md5, r.content_hash, r.username
  FROM ranked_items r
  WHERE r.rn_md5 = 1 AND r.rn_visual = 1
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;