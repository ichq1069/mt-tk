CREATE OR REPLACE FUNCTION get_untagged_media(
  p_page INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20,
  p_search TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  type TEXT,
  user_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  v_offset INTEGER := p_page * p_limit;
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.url,
    m.type,
    m.user_id,
    m.status,
    m.created_at,
    COUNT(*) OVER() as total_count
  FROM media_items m
  WHERE m.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM media_tags mt WHERE mt.media_id = m.id)
    AND (p_search = '' OR m.title ILIKE '%' || p_search || '%')
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;