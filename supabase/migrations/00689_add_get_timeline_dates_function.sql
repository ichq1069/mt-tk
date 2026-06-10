CREATE OR REPLACE FUNCTION get_timeline_dates(
  p_user_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT 'all',
  p_category_id TEXT DEFAULT 'all',
  p_tag_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (date TEXT, count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char((mi.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')::DATE, 'YYYY-MM-DD') as date,
    COUNT(*)::INTEGER as count
  FROM media_items mi
  WHERE 
    mi.status = 'approved' AND 
    mi.deleted_at IS NULL AND
    (p_type = 'all' OR mi.type = p_type) AND
    (p_category_id = 'all' OR mi.category_id = p_category_id) AND
    (p_tag_ids IS NULL OR mi.id IN (
      SELECT media_id FROM media_tags WHERE tag_id = ANY(p_tag_ids)
    ))
  GROUP BY 1
  ORDER BY 1 DESC;
END;
$$;