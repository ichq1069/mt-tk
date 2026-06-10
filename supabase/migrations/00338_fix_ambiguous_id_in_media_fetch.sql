CREATE OR REPLACE FUNCTION public.get_optimized_media_items_v3(p_user_id uuid DEFAULT NULL::uuid, p_type text DEFAULT 'all'::text, p_category_id text DEFAULT 'all'::text, p_tag_ids uuid[] DEFAULT NULL::uuid[], p_sort_by text DEFAULT 'latest'::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, url text, thumbnail_url text, type text, category_id uuid, user_id uuid, view_count bigint, favorite_count bigint, heat_score double precision, created_at timestamp with time zone, status text, deleted_at timestamp with time zone, is_hidden boolean, username text, avatar_url text, content_categories jsonb, media_tags jsonb, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_excluded_category_ids uuid[];
    v_excluded_tag_ids uuid[];
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
    -- 使用明确的表限定符避免 "id" 歧义
    v_excluded_category_ids := ARRAY(
        SELECT sub_cc_id FROM (
            SELECT unnest(v_excluded_category_ids) as sub_cc_id
            UNION
            SELECT cat.id FROM public.content_categories cat WHERE cat.is_visible = false
        ) s
    );
    
    v_excluded_tag_ids := ARRAY(
        SELECT sub_t_id FROM (
            SELECT unnest(v_excluded_tag_ids) as sub_t_id
            UNION
            SELECT tg.id FROM public.tags tg WHERE tg.is_visible = false
        ) s
    );

    -- 针对不同排序模式采用独立查询分支
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
          ))
          -- 全局可见性过滤（分类）
          AND (cc.is_visible IS NULL OR cc.is_visible = true)
          -- 全局可见性过滤（标签：如果图片绑定的任意一个标签不可见，则该图片不显示）
          AND NOT EXISTS (
              SELECT 1 FROM public.media_tags mt
              JOIN public.tags t ON mt.tag_id = t.id
              WHERE mt.media_id = m.id AND t.is_visible = false
          )
          -- 用户排除过滤
          AND (v_excluded_category_ids IS NULL OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
          AND (v_excluded_tag_ids IS NULL OR NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids)))
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
          ))
          -- 全局可见性过滤（分类）
          AND (cc.is_visible IS NULL OR cc.is_visible = true)
          -- 全局可见性过滤（标签）
          AND NOT EXISTS (
              SELECT 1 FROM public.media_tags mt
              JOIN public.tags t ON mt.tag_id = t.id
              WHERE mt.media_id = m.id AND t.is_visible = false
          )
          -- 用户排除过滤
          AND (v_excluded_category_ids IS NULL OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
          AND (v_excluded_tag_ids IS NULL OR NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids)))
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
          ))
          -- 全局可见性过滤（分类）
          AND (cc.is_visible IS NULL OR cc.is_visible = true)
          -- 全局可见性过滤（标签）
          AND NOT EXISTS (
              SELECT 1 FROM public.media_tags mt
              JOIN public.tags t ON mt.tag_id = t.id
              WHERE mt.media_id = m.id AND t.is_visible = false
          )
          -- 用户排除过滤
          AND (v_excluded_category_ids IS NULL OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
          AND (v_excluded_tag_ids IS NULL OR NOT EXISTS (SELECT 1 FROM public.media_tags mt WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids)))
        ORDER BY RANDOM()
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$function$
