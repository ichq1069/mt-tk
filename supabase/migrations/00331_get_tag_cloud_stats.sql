CREATE OR REPLACE FUNCTION get_tag_cloud_stats()
RETURNS TABLE (id uuid, name text, count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT t.id, t.name, count(mt.media_id) as count
  FROM tags t
  LEFT JOIN media_tags mt ON t.id = mt.tag_id
  LEFT JOIN media_items mi ON mt.media_id = mi.id AND mi.deleted_at IS NULL AND mi.status::public.item_status = 'approved'::public.item_status
  GROUP BY t.id, t.name
  HAVING count(mt.media_id) > 0
  ORDER BY count DESC, t.name ASC
  LIMIT 200;
$$;