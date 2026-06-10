CREATE OR REPLACE FUNCTION public.get_media_by_similar_hash(p_hash text, p_threshold integer DEFAULT 5)
 RETURNS TABLE(id uuid, user_id uuid, url text, type text, content_hash text, created_at timestamp with time zone, profiles jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT m2.dedupe_version 
    FROM public.media_items m2 
    WHERE m2.content_hash = p_hash 
    LIMIT 1
  )
  SELECT 
    m.id, 
    m.user_id, 
    m.url, 
    m.type, 
    m.content_hash, 
    m.created_at,
    CASE 
      WHEN p.id IS NOT NULL THEN row_to_json(p)::jsonb 
      ELSE NULL 
    END as profiles
  FROM public.media_items m
  LEFT JOIN public.profiles p ON m.user_id = p.id
  CROSS JOIN target t
  WHERE m.content_hash IS NOT NULL 
    AND m.type = 'image' 
    AND m.deleted_at IS NULL
    AND (m.dedupe_ignored IS NULL OR m.dedupe_ignored = FALSE)
    AND m.dedupe_version = t.dedupe_version
    AND bit_count(('x' || lpad(m.content_hash, 16, '0'))::bit(64) # ('x' || lpad(p_hash, 16, '0'))::bit(64)) <= p_threshold
  ORDER BY m.created_at ASC;
END;
$function$;