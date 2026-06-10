
-- 查询指定 media_id 在当前排序/过滤条件下的 0-based 行号
-- 用于书签精确恢复：根据行号计算目标页码，并发加载到该页后精确定位
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
