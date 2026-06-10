-- Re-create the function with a slightly different return type or name to force PostgREST to refresh its cache
-- Actually, let's just use the same name but ensure it's fully qualified and re-granted
DROP FUNCTION IF EXISTS public.get_random_daily_gallery_images(p_count integer);

CREATE OR REPLACE FUNCTION public.get_random_daily_gallery_images(p_count integer)
 RETURNS TABLE(id uuid, url text, title text, description text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_random_daily_gallery_images(p_count integer) TO anon, authenticated, service_role;

-- Also refresh the column itself just in case
ALTER TABLE public.media_items ALTER COLUMN exclude_from_daily_gallery SET DEFAULT FALSE;
