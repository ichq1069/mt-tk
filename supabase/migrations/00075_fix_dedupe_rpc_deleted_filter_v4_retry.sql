DROP FUNCTION IF EXISTS public.get_duplicate_media();
DROP FUNCTION IF EXISTS public.get_visually_duplicate_media(integer);

-- Update MD5 duplicate detection
CREATE OR REPLACE FUNCTION public.get_duplicate_media()
 RETURNS TABLE(file_md5 text, duplicate_count bigint, first_upload_at timestamp with time zone, total_size bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.file_md5,
    COUNT(*)::BIGINT as duplicate_count,
    MIN(m.created_at) as first_upload_at,
    0::BIGINT as total_size
  FROM public.media_items m
  WHERE m.file_md5 IS NOT NULL AND m.deleted_at IS NULL
  GROUP BY m.file_md5
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$function$;

-- Update Visual duplicate detection
CREATE OR REPLACE FUNCTION public.get_visually_duplicate_media(p_threshold integer DEFAULT 5)
 RETURNS TABLE(content_hash text, duplicate_count bigint, first_upload_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.content_hash,
    COUNT(*)::BIGINT as duplicate_count,
    MIN(m.created_at) as first_upload_at
  FROM public.media_items m
  WHERE m.content_hash IS NOT NULL AND m.type = 'image' AND m.deleted_at IS NULL
  GROUP BY m.content_hash
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$function$;
