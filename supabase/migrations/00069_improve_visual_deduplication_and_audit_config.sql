-- 更新相似内容查重函数，增加阈值参数支持
CREATE OR REPLACE FUNCTION get_visually_duplicate_media(p_threshold int DEFAULT 5)
RETURNS TABLE (
  content_hash text,
  duplicate_count bigint,
  first_upload_at timestamptz,
  similar_hashes text[]
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT 
      m.content_hash,
      MIN(m.created_at) as first_up,
      COUNT(*)::bigint as dc
    FROM media_items m
    WHERE m.content_hash IS NOT NULL
    GROUP BY m.content_hash
  )
  SELECT 
    b1.content_hash,
    b1.dc as duplicate_count,
    b1.first_up as first_upload_at,
    ARRAY_AGG(b2.content_hash) as similar_hashes
  FROM base b1
  LEFT JOIN base b2 ON b1.content_hash <> b2.content_hash 
    AND hamming_distance(b1.content_hash, b2.content_hash) <= p_threshold
  GROUP BY b1.content_hash, b1.dc, b1.first_up
  HAVING b1.dc > 1 OR COUNT(b2.content_hash) > 0
  ORDER BY b1.dc DESC, b1.first_up DESC;
END;
$$;

-- 如果没有 hamming_distance 函数，请补全（通常已经存在）
CREATE OR REPLACE FUNCTION public.hamming_distance(h1 text, h2 text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    distance INTEGER := 0;
    i INTEGER;
    len INTEGER;
BEGIN
    IF h1 IS NULL OR h2 IS NULL THEN
        RETURN 999;
    END IF;
    len := LEAST(LENGTH(h1), LENGTH(h2));
    FOR i IN 1..len LOOP
        IF SUBSTRING(h1 FROM i FOR 1) <> SUBSTRING(h2 FROM i FOR 1) THEN
            distance := distance + 1;
        END IF;
    END LOOP;
    distance := distance + (ABS(LENGTH(h1) - LENGTH(h2)));
    RETURN distance;
END;
$function$;
