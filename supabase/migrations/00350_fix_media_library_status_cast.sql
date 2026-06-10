CREATE OR REPLACE FUNCTION public.get_media_library_v2(p_page integer DEFAULT 0, p_limit integer DEFAULT 20, p_search text DEFAULT ''::text, p_status text DEFAULT 'all'::text, p_type text DEFAULT 'all'::text, p_category_id text DEFAULT 'all'::text, p_tag_id text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, title text, url text, thumbnail_url text, type text, status text, category_id uuid, user_id uuid, created_at timestamp with time zone, total_count bigint)
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
    m.thumbnail_url,
    m.type,
    m.status::text,
    m.category_id,
    m.user_id,
    m.created_at,
    COUNT(*) OVER() as total_count
  FROM media_items m
  WHERE (p_search = '' OR m.title ILIKE '%' || p_search || '%')
    AND (
      CASE 
        WHEN p_status = 'all' THEN m.deleted_at IS NULL
        WHEN p_status = 'deleted' THEN m.deleted_at IS NOT NULL
        ELSE m.status::text = p_status AND m.deleted_at IS NULL
      END
    )
    AND (p_type = 'all' OR m.type = p_type)
    AND (
      p_category_id = 'all' 
      OR (p_category_id = 'none' AND m.category_id IS NULL)
      OR (m.category_id = p_category_id::UUID)
    )
    AND (
      p_tag_id = 'all'
      OR (p_tag_id = 'none' AND NOT EXISTS (SELECT 1 FROM media_tags mt WHERE mt.media_id = m.id))
      OR (EXISTS (SELECT 1 FROM media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = p_tag_id::UUID))
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$function$;