-- 先删除原有函数
DROP FUNCTION IF EXISTS public.get_tag_cloud_stats();

-- 然后重新创建并带上 is_visible 和 min_role
CREATE OR REPLACE FUNCTION public.get_tag_cloud_stats()
 RETURNS TABLE(id uuid, name text, is_visible boolean, min_role text, count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.id, t.name, t.is_visible, t.min_role, count(mt.media_id) as count
  FROM tags t
  LEFT JOIN media_tags mt ON t.id = mt.tag_id
  LEFT JOIN media_items mi ON mt.media_id = mi.id AND mi.deleted_at IS NULL AND mi.status::public.item_status = 'approved'::public.item_status
  WHERE t.is_visible = true  -- 这里是关键的过滤条件
  GROUP BY t.id, t.name, t.is_visible, t.min_role
  HAVING count(mt.media_id) > 0
  ORDER BY count DESC, t.name ASC
  LIMIT 200;
$function$
