
CREATE OR REPLACE FUNCTION public.get_category_cloud()
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    icon text,
    sort_order integer,
    is_visible boolean,
    min_role text,
    count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.name,
    cc.description,
    cc.icon,
    cc.sort_order,
    cc.is_visible,
    cc.min_role,
    COUNT(mi.id) as count
  FROM public.content_categories cc
  LEFT JOIN public.media_items mi ON cc.id = mi.category_id 
    AND mi.deleted_at IS NULL 
    AND mi.status::public.item_status = 'approved'::public.item_status
  WHERE cc.is_visible = true  -- 加入可见性过滤
  GROUP BY cc.id, cc.name, cc.description, cc.icon, cc.sort_order, cc.is_visible, cc.min_role
  ORDER BY cc.sort_order ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
