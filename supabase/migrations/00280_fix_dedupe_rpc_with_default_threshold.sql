CREATE OR REPLACE FUNCTION public.get_visually_duplicate_media(
  p_threshold integer DEFAULT 5
)
RETURNS TABLE(
  content_hash text,
  duplicate_count bigint,
  first_upload_at timestamp with time zone,
  preview_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH valid_items AS (
    -- 提取所有有效的图片指纹数据
    SELECT m.id, m.content_hash, m.created_at, m.dedupe_version, m.url
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
      -- 相似判定 (使用 bit_count 比较)
      AND bit_count(('x' || lpad(m1.content_hash, 16, '0'))::bit(64) # ('x' || lpad(m2.content_hash, 16, '0'))::bit(64)) <= p_threshold
      -- 排序判定：只选最早的
      AND (m2.created_at < m1.created_at OR (m2.created_at = m1.created_at AND m2.id < m1.id))
    )
  )
  -- 统计每个代表周围有多少个相似项（含自己，版本需一致）
  SELECT 
    r.content_hash,
    COUNT(v.id)::BIGINT as duplicate_count,
    MIN(v.created_at) as first_upload_at,
    (SELECT v2.url FROM valid_items v2 WHERE v2.content_hash = r.content_hash AND v2.dedupe_version = r.dedupe_version ORDER BY v2.created_at ASC LIMIT 1) as preview_url
  FROM representatives r
  JOIN valid_items v ON (
    v.dedupe_version = r.dedupe_version
    AND bit_count(('x' || lpad(r.content_hash, 16, '0'))::bit(64) # ('x' || lpad(v.content_hash, 16, '0'))::bit(64)) <= p_threshold
  )
  GROUP BY r.content_hash, r.dedupe_version
  HAVING COUNT(v.id) > 1
  ORDER BY duplicate_count DESC, first_upload_at DESC;
END;
$$;