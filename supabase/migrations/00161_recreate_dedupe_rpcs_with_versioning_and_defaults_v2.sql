CREATE OR REPLACE FUNCTION public.get_visually_duplicate_media(p_threshold integer = 5)
 RETURNS TABLE(content_hash text, duplicate_count bigint, first_upload_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH valid_items AS (
    -- 提取所有有效的图片指纹数据
    SELECT m.id, m.content_hash, m.created_at, m.dedupe_version
    FROM public.media_items m
    WHERE m.content_hash IS NOT NULL 
      AND m.type = 'image' 
      AND m.deleted_at IS NULL
      AND (m.dedupe_ignored IS NULL OR m.dedupe_ignored = FALSE)
  ),
  representatives AS (
    -- 核心逻辑：在每一个“相似圈”中，只选出最早的那一个作为“代表”
    -- 且该相似圈内的成员版本必须一致
    SELECT m1.id, m1.content_hash, m1.created_at, m1.dedupe_version
    FROM valid_items m1
    WHERE NOT EXISTS (
      SELECT 1 FROM valid_items m2
      WHERE m2.id != m1.id
      -- 版本必须一致
      AND m2.dedupe_version = m1.dedupe_version
      -- 相似判定
      AND bit_count(('x' || lpad(m1.content_hash, 16, '0'))::bit(64) # ('x' || lpad(m2.content_hash, 16, '0'))::bit(64)) <= p_threshold
      -- 排序判定
      AND (m2.created_at < m1.created_at OR (m2.created_at = m1.created_at AND m2.id < m1.id))
    )
  )
  -- 统计每个代表周围有多少个相似项（含自己，版本需一致）
  SELECT 
    r.content_hash,
    COUNT(v.id)::BIGINT as duplicate_count,
    MIN(v.created_at) as first_upload_at
  FROM representatives r
  JOIN valid_items v ON (
    v.dedupe_version = r.dedupe_version
    AND bit_count(('x' || lpad(r.content_hash, 16, '0'))::bit(64) # ('x' || lpad(v.content_hash, 16, '0'))::bit(64)) <= p_threshold
  )
  GROUP BY r.id, r.content_hash, r.dedupe_version
  HAVING COUNT(v.id) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_media_by_similar_hash(p_hash text, p_threshold integer = 5)
 RETURNS TABLE(id uuid, user_id uuid, url text, type text, content_hash text, created_at timestamp with time zone, profiles jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT dedupe_version FROM public.media_items WHERE content_hash = p_hash LIMIT 1
  )
  SELECT 
    m.id, m.user_id, m.url, m.type, m.content_hash, m.created_at,
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
    -- 版本需与目标项一致，否则不视为同一组重复
    AND m.dedupe_version = t.dedupe_version
    AND bit_count(('x' || lpad(m.content_hash, 16, '0'))::bit(64) # ('x' || lpad(p_hash, 16, '0'))::bit(64)) <= p_threshold
  ORDER BY m.created_at ASC;
END;
$function$;
