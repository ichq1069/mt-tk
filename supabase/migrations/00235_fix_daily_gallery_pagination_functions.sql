-- Fix get_random_daily_gallery_images_v2 to support pagination
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
    AND NOT EXISTS (
      SELECT 1 
      FROM public.tags t 
      JOIN public.media_tags mt ON t.id = mt.tag_id 
      WHERE mt.media_id = m.id AND t.name = '限制级'
    )
    AND NOT EXISTS (
      -- 排除最近发布过的，避免重复
      SELECT 1 
      FROM public.daily_gallery_posts p 
      WHERE m.id = ANY(p.image_ids)
    )
  ORDER BY m.created_at DESC -- Stable order for pagination
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Ensure get_used_daily_gallery_images is correctly defined
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
