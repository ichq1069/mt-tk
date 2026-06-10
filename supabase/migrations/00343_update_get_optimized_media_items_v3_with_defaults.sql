
CREATE OR REPLACE FUNCTION public.get_optimized_media_items_v3(
    p_user_id uuid,
    p_type text DEFAULT 'all',
    p_category_id text DEFAULT 'all',
    p_tag_ids uuid[] DEFAULT NULL,
    p_sort_by text DEFAULT 'latest',
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    title text,
    url text,
    thumbnail_url text,
    type text,
    category_id uuid,
    user_id uuid,
    view_count bigint,
    favorite_count bigint,
    heat_score double precision,
    created_at timestamptz,
    status text,
    deleted_at timestamptz,
    is_hidden boolean,
    username text,
    avatar_url text,
    content_categories jsonb,
    media_tags jsonb,
    total_count bigint
) AS $$
DECLARE
    v_excluded_category_ids uuid[] := ARRAY[]::uuid[];
    v_excluded_tag_ids uuid[] := ARRAY[]::uuid[];
BEGIN
    -- 获取用户的黑名单配置（如果有）
    IF p_user_id IS NOT NULL THEN
        SELECT 
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(prof.custom_fields->'preferences'->'disliked_categories')::uuid), ARRAY[]::uuid[]),
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(prof.custom_fields->'preferences'->'disliked_tags')::uuid), ARRAY[]::uuid[])
        INTO v_excluded_category_ids, v_excluded_tag_ids
        FROM public.profiles AS prof
        WHERE prof.id = p_user_id;
    END IF;

    -- 追加过滤：获取所有设置为不可见(is_visible=false)的分类和标签ID
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

    RETURN QUERY
    WITH filtered_items AS (
        SELECT 
            m.*,
            p.username,
            p.avatar_url,
            to_jsonb(cc.*) as content_categories_json,
            COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
                 FROM public.media_tags mt
                 JOIN public.tags t ON mt.tag_id = t.id
                 WHERE mt.media_id = m.id),
                '[]'::jsonb
            ) as media_tags_json
        FROM public.media_items m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN public.content_categories cc ON m.category_id = cc.id
        WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL AND m.is_hidden = false
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
          AND (p_user_id IS NULL OR (
              NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.media_id = m.id AND f.user_id = p_user_id)
              AND NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id)
          ))
          -- 全局可见性过滤（分类）
          AND (m.category_id IS NULL OR (cc.id IS NOT NULL AND cc.is_visible = true))
          -- 全局可见性过滤（标签）
          AND NOT EXISTS (
              SELECT 1 FROM public.media_tags mt
              JOIN public.tags t ON mt.tag_id = t.id
              WHERE mt.media_id = m.id AND t.is_visible = false
          )
          -- 用户/可见性排除过滤
          AND (m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
          AND NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids))
    ),
    total_count_cte AS (
        SELECT count(*) as total FROM filtered_items
    )
    SELECT 
        fi.id, fi.title, fi.url, fi.thumbnail_url, fi.type, fi.category_id, fi.user_id,
        COALESCE(fi.view_count, 0)::bigint, COALESCE(fi.favorite_count, 0)::bigint, COALESCE(fi.heat_score, 0)::double precision,
        fi.created_at, fi.status::text, fi.deleted_at, fi.is_hidden,
        fi.username, fi.avatar_url,
        fi.content_categories_json,
        fi.media_tags_json,
        tc.total
    FROM filtered_items fi, total_count_cte tc
    ORDER BY 
        CASE WHEN p_sort_by = 'latest' THEN fi.created_at END DESC,
        CASE WHEN p_sort_by = 'popular' THEN fi.heat_score END DESC,
        CASE WHEN p_sort_by = 'popular' THEN fi.view_count END DESC,
        CASE WHEN p_sort_by = 'popular' THEN fi.created_at END DESC,
        CASE WHEN p_sort_by = 'random' THEN RANDOM() END
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
