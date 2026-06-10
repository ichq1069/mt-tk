-- 更新 RPC 函数，使用 IF 分支确保命中复合索引，提升排序性能
CREATE OR REPLACE FUNCTION public.get_optimized_media_items_v3(
    p_user_id uuid DEFAULT NULL,
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
    created_at timestamp with time zone,
    status text,
    deleted_at timestamp with time zone,
    is_hidden boolean,
    username text,
    avatar_url text,
    content_categories jsonb,
    media_tags jsonb,
    total_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_excluded_category_ids uuid[];
    v_excluded_tag_ids uuid[];
BEGIN
    -- 获取用户的黑名单配置（如果有）
    IF p_user_id IS NOT NULL THEN
        SELECT 
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(custom_fields->'preferences'->'disliked_categories')::uuid), ARRAY[]::uuid[]),
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(custom_fields->'preferences'->'disliked_tags')::uuid), ARRAY[]::uuid[])
        INTO v_excluded_category_ids, v_excluded_tag_ids
        FROM public.profiles
        WHERE id = p_user_id;
    END IF;

    -- 针对不同排序模式采用独立查询分支，确保命中对应的复合索引
    IF p_sort_by = 'latest' THEN
        RETURN QUERY
        SELECT 
            m.id, m.title, m.url, m.thumbnail_url, m.type, m.category_id, m.user_id,
            COALESCE(m.view_count, 0)::bigint, COALESCE(m.favorite_count, 0)::bigint, COALESCE(m.heat_score, 0)::double precision,
            m.created_at, m.status::text, m.deleted_at, m.is_hidden,
            p.username, p.avatar_url,
            to_jsonb(cc.*),
            COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
                 FROM public.media_tags mt
                 JOIN public.tags t ON mt.tag_id = t.id
                 WHERE mt.media_id = m.id),
                '[]'::jsonb
            ),
            COUNT(*) OVER()
        FROM public.media_items m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN public.content_categories cc ON m.category_id = cc.id
        WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL AND m.is_hidden = false
          AND (p_type = 'all' OR m.type = p_type)
          AND (p_category_id = 'all' OR m.category_id = p_category_id::uuid)
          AND (p_tag_ids IS NULL OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL OR EXISTS (
              SELECT 1 FROM public.media_tags mt 
              WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
          ))
          AND (p_user_id IS NULL OR (
              NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.media_id = m.id AND f.user_id = p_user_id)
              AND NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id)
              AND (v_excluded_category_ids IS NULL OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
              AND (v_excluded_tag_ids IS NULL OR NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids)))
          ))
        ORDER BY m.created_at DESC
        LIMIT p_limit OFFSET p_offset;

    ELSIF p_sort_by = 'popular' THEN
        RETURN QUERY
        SELECT 
            m.id, m.title, m.url, m.thumbnail_url, m.type, m.category_id, m.user_id,
            COALESCE(m.view_count, 0)::bigint, COALESCE(m.favorite_count, 0)::bigint, COALESCE(m.heat_score, 0)::double precision,
            m.created_at, m.status::text, m.deleted_at, m.is_hidden,
            p.username, p.avatar_url,
            to_jsonb(cc.*),
            COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
                 FROM public.media_tags mt
                 JOIN public.tags t ON mt.tag_id = t.id
                 WHERE mt.media_id = m.id),
                '[]'::jsonb
            ),
            COUNT(*) OVER()
        FROM public.media_items m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN public.content_categories cc ON m.category_id = cc.id
        WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL AND m.is_hidden = false
          AND (p_type = 'all' OR m.type = p_type)
          AND (p_category_id = 'all' OR m.category_id = p_category_id::uuid)
          AND (p_tag_ids IS NULL OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL OR EXISTS (
              SELECT 1 FROM public.media_tags mt 
              WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
          ))
          AND (p_user_id IS NULL OR (
              NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.media_id = m.id AND f.user_id = p_user_id)
              AND NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id)
              AND (v_excluded_category_ids IS NULL OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
              AND (v_excluded_tag_ids IS NULL OR NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids)))
          ))
        ORDER BY m.heat_score DESC, m.view_count DESC, m.created_at DESC
        LIMIT p_limit OFFSET p_offset;

    ELSE -- random
        RETURN QUERY
        SELECT 
            m.id, m.title, m.url, m.thumbnail_url, m.type, m.category_id, m.user_id,
            COALESCE(m.view_count, 0)::bigint, COALESCE(m.favorite_count, 0)::bigint, COALESCE(m.heat_score, 0)::double precision,
            m.created_at, m.status::text, m.deleted_at, m.is_hidden,
            p.username, p.avatar_url,
            to_jsonb(cc.*),
            COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
                 FROM public.media_tags mt
                 JOIN public.tags t ON mt.tag_id = t.id
                 WHERE mt.media_id = m.id),
                '[]'::jsonb
            ),
            COUNT(*) OVER()
        FROM public.media_items m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN public.content_categories cc ON m.category_id = cc.id
        WHERE m.status::public.item_status = 'approved'::public.item_status AND m.deleted_at IS NULL AND m.is_hidden = false
          AND (p_type = 'all' OR m.type = p_type)
          AND (p_category_id = 'all' OR m.category_id = p_category_id::uuid)
          AND (p_tag_ids IS NULL OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL OR EXISTS (
              SELECT 1 FROM public.media_tags mt 
              WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
          ))
          AND (p_user_id IS NULL OR (
              NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.media_id = m.id AND f.user_id = p_user_id)
              AND NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id)
              AND (v_excluded_category_ids IS NULL OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
              AND (v_excluded_tag_ids IS NULL OR NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids)))
          ))
        ORDER BY RANDOM()
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$;
