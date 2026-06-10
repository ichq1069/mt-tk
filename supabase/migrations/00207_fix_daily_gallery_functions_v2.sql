-- 1. 先删除旧的函数以更新返回类型
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images(integer);

-- 2. 重新创建，增加 status 并加入 exclude_from_daily_gallery 过滤
CREATE OR REPLACE FUNCTION public.get_random_daily_gallery_images(p_count integer)
 RETURNS TABLE(id uuid, url text, title text, description text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.id, m.url, m.title, m.description, m.status::text
  FROM media_items m
  WHERE m.status::public.item_status = 'approved'::public.item_status 
    AND m.is_hidden = false 
    AND m.type = 'image'
    AND m.exclude_from_daily_gallery = false
    AND NOT EXISTS (
      SELECT 1 
      FROM tags t 
      JOIN media_tags mt ON t.id = mt.tag_id 
      WHERE mt.media_id = m.id AND t.name = '限制级'
    )
    AND NOT EXISTS (
      -- 排除最近发布过的，避免重复
      SELECT 1 
      FROM daily_gallery_posts p 
      WHERE m.id = ANY(p.image_ids)
    )
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$function$;

-- 3. 创建获取已使用的每日图集图片的函数
DROP FUNCTION IF EXISTS public.get_used_daily_gallery_images(integer, integer);
CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, url text, title text, description text, used_at timestamp with time zone, post_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.id, m.url, m.title, m.description, p.created_at as used_at, p.post_date
  FROM media_items m
  JOIN daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.type = 'image'
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
