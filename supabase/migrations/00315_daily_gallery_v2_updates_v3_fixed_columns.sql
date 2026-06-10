-- 修正已使用素材库查询：增加 daily_gallery_status 返回
DROP FUNCTION IF EXISTS public.get_used_daily_gallery_images(integer, integer, text);
CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(p_limit integer, p_offset integer, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, url text, title text, description text, used_at timestamp with time zone, post_date date, has_record boolean, daily_gallery_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, 
    m.url, 
    m.title, 
    m.description, 
    p.created_at as used_at, 
    p.post_date,
    (p.id IS NOT NULL) as has_record,
    m.daily_gallery_status::text
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
  ORDER BY p.post_date DESC NULLS LAST, p.created_at DESC NULLS LAST, m.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- 授权
GRANT EXECUTE ON FUNCTION public.get_used_daily_gallery_images(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_used_daily_gallery_images(integer, integer, text) TO service_role;

-- 刷新 schema 缓存
NOTIFY pgrst, 'reload schema';
