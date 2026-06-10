-- 首先删除旧版本的函数
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images_v2(integer);
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images_v2(integer, integer);

-- 重新创建支持分页的函数
CREATE OR REPLACE FUNCTION public.get_random_daily_gallery_images_v2(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, url text, title text, description text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.id, m.url, m.title, m.description, m.status::text
  FROM public.media_items m
  WHERE m.status::public.item_status = 'approved'::public.item_status 
    AND m.is_hidden = false 
    AND m.type = 'image'
    AND COALESCE(m.exclude_from_daily_gallery, false) = false
    -- 排除含有“限制级”标签的图片
    AND NOT EXISTS (
      SELECT 1 
      FROM public.tags t 
      JOIN public.media_tags mt ON t.id = mt.tag_id 
      WHERE mt.media_id = m.id AND t.name = '限制级'
    )
    -- 排除已经发布过的图片
    AND NOT EXISTS (
      SELECT 1 
      FROM public.daily_gallery_posts p 
      WHERE m.id = ANY(p.image_ids)
    )
  ORDER BY m.created_at DESC -- 分页需要稳定排序
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.get_random_daily_gallery_images_v2(integer, integer) TO anon, authenticated, service_role;

-- 同样修复 get_used_daily_gallery_images
DROP FUNCTION IF EXISTS public.get_used_daily_gallery_images(integer, integer);
CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, url text, title text, description text, used_at timestamp with time zone, post_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.id, m.url, m.title, m.description, p.created_at as used_at, p.post_date
  FROM public.media_items m
  JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.type = 'image'
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.get_used_daily_gallery_images(integer, integer) TO anon, authenticated, service_role;
