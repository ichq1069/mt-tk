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
  WHERE m.file_md5 IS NOT NULL 
    AND m.deleted_at IS NULL
    AND (m.dedupe_ignored IS NULL OR m.dedupe_ignored = FALSE)
  GROUP BY m.file_md5, m.dedupe_version
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$function$;