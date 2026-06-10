
-- 优化 get_media_row_number RPC 函数，处理空数组标签的情况，增强类型匹配稳健性
CREATE OR REPLACE FUNCTION get_media_row_number(
  p_media_id uuid,
  p_sort_by text DEFAULT 'latest',
  p_type text DEFAULT 'all',
  p_category_id text DEFAULT 'all',
  p_tag_ids uuid[] DEFAULT NULL
) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT (rn - 1)::integer
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE WHEN p_sort_by = 'popular' THEN heat_score END DESC NULLS LAST,
              created_at DESC
          ) AS rn
        FROM media_items
        WHERE status = 'approved'
          AND deleted_at IS NULL
          AND is_hidden = FALSE
          AND (p_type = 'all' OR type = p_type)
          AND (p_category_id = 'all' OR category_id::text = p_category_id)
          AND (
            p_tag_ids IS NULL 
            OR array_length(p_tag_ids, 1) IS NULL -- 处理空数组 [] 的情况
            OR id IN (
              SELECT media_id FROM media_tags WHERE tag_id = ANY(p_tag_ids)
            )
          )
      ) ranked
      WHERE id = p_media_id
    ),
    -1
  );
$$;
