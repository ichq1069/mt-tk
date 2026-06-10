CREATE OR REPLACE FUNCTION public.get_visually_duplicate_media(p_threshold integer DEFAULT 5)
 RETURNS TABLE(content_hash text, duplicate_count bigint, first_upload_at timestamp with time zone, preview_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH valid_items AS (
    SELECT vi.id, vi.content_hash, vi.created_at, vi.dedupe_version, vi.url
    FROM public.media_items vi
    WHERE vi.content_hash IS NOT NULL 
      AND vi.type = 'image' 
      AND vi.deleted_at IS NULL
      AND (vi.dedupe_ignored IS NULL OR vi.dedupe_ignored = FALSE)
  ),
  representatives AS (
    SELECT v1.id, v1.content_hash, v1.created_at, v1.dedupe_version
    FROM valid_items v1
    WHERE NOT EXISTS (
      SELECT 1 FROM valid_items v2
      WHERE v2.id != v1.id
      AND v2.dedupe_version = v1.dedupe_version
      AND bit_count(('x' || lpad(v1.content_hash, 16, '0'))::bit(64) # ('x' || lpad(v2.content_hash, 16, '0'))::bit(64)) <= p_threshold
      AND (v2.created_at < v1.created_at OR (v2.created_at = v1.created_at AND v2.id < v1.id))
    )
  )
  SELECT 
    r.content_hash,
    COUNT(v.id)::BIGINT as duplicate_count,
    MIN(v.created_at) as first_upload_at,
    (SELECT v3.url FROM valid_items v3 WHERE v3.content_hash = r.content_hash AND v3.dedupe_version = r.dedupe_version ORDER BY v3.created_at ASC LIMIT 1) as preview_url
  FROM representatives r
  JOIN valid_items v ON (
    v.dedupe_version = r.dedupe_version
    AND bit_count(('x' || lpad(r.content_hash, 16, '0'))::bit(64) # ('x' || lpad(v.content_hash, 16, '0'))::bit(64)) <= p_threshold
  )
  GROUP BY r.content_hash, r.dedupe_version
  HAVING COUNT(v.id) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$function$;