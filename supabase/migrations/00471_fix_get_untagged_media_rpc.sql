CREATE OR REPLACE FUNCTION public.get_untagged_media(p_page integer DEFAULT 0, p_limit integer DEFAULT 20, p_search text DEFAULT ''::text)
 RETURNS TABLE(id uuid, title text, url text, type text, user_id uuid, status text, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_offset INTEGER := p_page * p_limit;
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.url,
    m.type,
    m.user_id,
    m.status::text,  -- Explicitly cast enum to text
    m.created_at,
    COUNT(*) OVER() as total_count
  FROM media_items m
  WHERE m.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM media_tags mt WHERE mt.media_id = m.id)
    AND (p_search = '' OR m.title ILIKE '%' || p_search || '%')
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$function$;