CREATE OR REPLACE FUNCTION get_tag_management_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  weight INTEGER,
  is_visible BOOLEAN,
  min_role TEXT,
  created_at TIMESTAMPTZ,
  media_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.weight,
    t.is_visible,
    t.min_role,
    t.created_at,
    COUNT(mt.media_id) as media_count
  FROM tags t
  LEFT JOIN media_tags mt ON t.id = mt.tag_id
  GROUP BY t.id, t.name, t.weight, t.is_visible, t.min_role, t.created_at
  ORDER BY t.weight DESC, t.created_at DESC;
END;
$$ LANGUAGE plpgsql;