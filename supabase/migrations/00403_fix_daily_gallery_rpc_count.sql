DROP FUNCTION IF EXISTS public.get_daily_gallery_available_images_rpc(p_limit integer, p_offset integer, p_search text, p_status text);

CREATE OR REPLACE FUNCTION public.get_daily_gallery_available_images_rpc(p_limit integer, p_offset integer, p_search text, p_status text)
 RETURNS TABLE(id uuid, url text, title text, description text, status text, daily_gallery_status text, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_images AS (
    SELECT 
      m.id, 
      m.url, 
      m.title, 
      m.description, 
      m.status::text, 
      m.daily_gallery_status::text,
      m.created_at
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
      AND m.is_hidden = false
      AND m.type = 'image'
      AND m.deleted_at IS NULL
      AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
      AND m.daily_gallery_status = p_status
      AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
      AND (
        p_status != 'unused' OR NOT EXISTS (
          SELECT 1 FROM public.daily_gallery_posts p 
          WHERE m.id = ANY(p.image_ids)
        )
      )
  )
  SELECT *, (SELECT count(*) FROM filtered_images) AS total_count
  FROM filtered_images
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
