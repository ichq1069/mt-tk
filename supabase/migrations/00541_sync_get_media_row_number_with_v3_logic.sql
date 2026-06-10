
-- 同步 get_media_row_number 的逻辑与 get_optimized_media_items_v3 完全一致
-- 确保书签定位计算出的行号百分之百准确
CREATE OR REPLACE FUNCTION get_media_row_number(
  p_media_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_sort_by text DEFAULT 'latest',
  p_type text DEFAULT 'all',
  p_category_id text DEFAULT 'all',
  p_tag_ids uuid[] DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    v_excluded_category_ids uuid[] := ARRAY[]::uuid[];
    v_excluded_tag_ids uuid[] := ARRAY[]::uuid[];
    v_row_number integer;
BEGIN
    -- 获取屏蔽配置
    IF p_user_id IS NOT NULL THEN
        SELECT 
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(prof.custom_fields->'preferences'->'disliked_categories')::uuid), ARRAY[]::uuid[]),
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(prof.custom_fields->'preferences'->'disliked_tags')::uuid), ARRAY[]::uuid[])
        INTO v_excluded_category_ids, v_excluded_tag_ids
        FROM public.profiles AS prof
        WHERE prof.id = p_user_id;
    END IF;

    -- 追加不可见过滤
    v_excluded_category_ids := ARRAY(
        SELECT sub_cc_id FROM (
            SELECT unnest(COALESCE(v_excluded_category_ids, ARRAY[]::uuid[])) as sub_cc_id
            UNION
            SELECT cat.id FROM public.content_categories cat WHERE cat.is_visible = false
        ) s WHERE sub_cc_id IS NOT NULL
    );
    
    v_excluded_tag_ids := ARRAY(
        SELECT sub_t_id FROM (
            SELECT unnest(COALESCE(v_excluded_tag_ids, ARRAY[]::uuid[])) as sub_t_id
            UNION
            SELECT tg.id FROM public.tags tg WHERE tg.is_visible = false
        ) s WHERE sub_t_id IS NOT NULL
    );

    SELECT rn - 1 INTO v_row_number
    FROM (
        SELECT 
            m.id,
            ROW_NUMBER() OVER (
                ORDER BY 
                    CASE WHEN p_sort_by = 'latest' THEN m.created_at END DESC,
                    CASE WHEN p_sort_by = 'popular' THEN m.heat_score END DESC,
                    CASE WHEN p_sort_by = 'popular' THEN m.view_count END DESC,
                    CASE WHEN p_sort_by = 'popular' THEN m.created_at END DESC
            ) as rn
        FROM public.media_items m
        LEFT JOIN public.content_categories cc ON m.category_id = cc.id
        WHERE m.status = 'approved' AND m.deleted_at IS NULL AND m.is_hidden = false
          AND (p_type = 'all' OR m.type = p_type)
          AND (
            p_category_id = 'all' 
            OR (p_category_id = 'none' AND m.category_id IS NULL)
            OR (p_category_id != 'none' AND p_category_id != 'all' AND m.category_id = p_category_id::uuid)
          )
          AND (
            p_tag_ids IS NULL 
            OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL 
            OR (
                p_tag_ids = ARRAY['00000000-0000-0000-0000-000000000000']::uuid[] 
                AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id)
            )
            OR EXISTS (
              SELECT 1 FROM public.media_tags mt 
              WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
            )
          )
          AND (p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id))
          AND (m.category_id IS NULL OR (cc.id IS NOT NULL AND cc.is_visible = true))
          AND NOT EXISTS (
              SELECT 1 FROM public.media_tags mt
              JOIN public.tags t ON mt.tag_id = t.id
              WHERE mt.media_id = m.id AND t.is_visible = false
          )
          AND (m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
          AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids))
    ) ranked
    WHERE id = p_media_id;

    RETURN COALESCE(v_row_number, -1);
END;
$$;
