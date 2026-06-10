DROP FUNCTION IF EXISTS public.get_media_staging_v2(integer, integer, text);

CREATE OR REPLACE FUNCTION public.get_media_staging_v2(p_page integer, p_limit integer, p_status text DEFAULT 'pending'::text)
 RETURNS TABLE(id uuid, url text, thumbnail_url text, title text, type text, category_id uuid, owner_id uuid, status text, tag_names text[], created_at timestamp with time zone, deleted_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER := p_page * p_limit;
BEGIN
  RETURN QUERY
  SELECT 
    ms.id,
    ms.url,
    ms.thumbnail_url,
    ms.title,
    ms.type,
    ms.category_id,
    ms.owner_id,
    ms.status::text,
    ms.tag_names,
    ms.created_at,
    ms.deleted_at,
    COUNT(*) OVER() as total_count
  FROM public.media_staging ms
  WHERE ms.deleted_at IS NULL
    AND (p_status = 'all' OR ms.status::text = p_status)
  ORDER BY ms.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$function$;