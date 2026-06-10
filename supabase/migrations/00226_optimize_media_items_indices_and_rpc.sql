-- 1. 创建优化索引
-- 为“最新”排序优化索引
CREATE INDEX IF NOT EXISTS idx_media_items_latest 
ON public.media_items (status, is_hidden, deleted_at, created_at DESC);

-- 为“推荐/热门”排序优化索引
CREATE INDEX IF NOT EXISTS idx_media_items_popular 
ON public.media_items (status, is_hidden, deleted_at, heat_score DESC, view_count DESC);

-- 为类型和分类过滤优化索引
CREATE INDEX IF NOT EXISTS idx_media_items_type_cat 
ON public.media_items (type, category_id) 
WHERE status::public.item_status = 'approved'::public.item_status AND is_hidden = false AND deleted_at IS NULL;

-- 2. 创建高度优化的多功能查询函数
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
    v_total_count bigint;
    v_excluded_category_ids uuid[];
    v_excluded_tag_ids uuid[];
BEGIN
    -- 获取用户的黑名单配置（如果有）
    IF p_user_id IS NOT NULL THEN
        SELECT 
            ARRAY(SELECT jsonb_array_elements_text(custom_fields->'preferences'->'disliked_categories')::uuid),
            ARRAY(SELECT jsonb_array_elements_text(custom_fields->'preferences'->'disliked_tags')::uuid)
        INTO v_excluded_category_ids, v_excluded_tag_ids
        FROM public.profiles
        WHERE id = p_user_id;
    END IF;

    -- 计算符合条件的记录总数（为了性能，这一步可以选做，或者在前端分页逻辑中处理）
    -- 暂时先返回当前查询的数据，total_count 通过 window function 计算

    RETURN QUERY
    WITH filtered_items AS (
        SELECT 
            m.*,
            p.username as profile_username,
            p.avatar_url as profile_avatar_url,
            to_jsonb(cc.*) as cat_data,
            COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('tag_id', mt.tag_id, 'tags', t.*))
                 FROM public.media_tags mt
                 JOIN public.tags t ON mt.tag_id = t.id
                 WHERE mt.media_id = m.id),
                '[]'::jsonb
            ) as tags_data
        FROM public.media_items m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        LEFT JOIN public.content_categories cc ON m.category_id = cc.id
        WHERE m.status::public.item_status = 'approved'::public.item_status 
          AND m.deleted_at IS NULL 
          AND m.is_hidden = false
          -- 类型过滤
          AND (p_type = 'all' OR m.type = p_type)
          -- 分类过滤
          AND (p_category_id = 'all' OR m.category_id = p_category_id::uuid)
          -- 标签过滤（如果有传入标签 ID）
          AND (p_tag_ids IS NULL OR ARRAY_LENGTH(p_tag_ids, 1) IS NULL OR EXISTS (
              SELECT 1 FROM public.media_tags mt 
              WHERE mt.media_id = m.id AND mt.tag_id = ANY(p_tag_ids)
          ))
          -- 用户排除逻辑
          AND (p_user_id IS NULL OR (
              -- 排除收藏
              NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.media_id = m.id AND f.user_id = p_user_id)
              -- 排除不喜欢
              AND NOT EXISTS (SELECT 1 FROM public.dislikes d WHERE d.media_id = m.id AND d.user_id = p_user_id)
              -- 排除用户讨厌的分类
              AND (v_excluded_category_ids IS NULL OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_category_ids)))
              -- 排除用户讨厌的标签
              AND (v_excluded_tag_ids IS NULL OR NOT EXISTS (
                  SELECT 1 FROM public.media_tags mt 
                  WHERE mt.media_id = m.id AND mt.tag_id = ANY(v_excluded_tag_ids)
              ))
          ))
    )
    SELECT 
        fi.id,
        fi.title,
        fi.url,
        fi.thumbnail_url,
        fi.type,
        fi.category_id,
        fi.user_id,
        COALESCE(fi.view_count, 0)::bigint,
        COALESCE(fi.favorite_count, 0)::bigint,
        COALESCE(fi.heat_score, 0)::double precision,
        fi.created_at,
        fi.status::text,
        fi.deleted_at,
        fi.is_hidden,
        fi.profile_username,
        fi.profile_avatar_url,
        fi.cat_data,
        fi.tags_data,
        COUNT(*) OVER() as total_count
    FROM filtered_items fi
    ORDER BY 
        CASE WHEN p_sort_by = 'popular' THEN fi.heat_score END DESC,
        CASE WHEN p_sort_by = 'popular' THEN fi.view_count END DESC,
        CASE WHEN p_sort_by = 'latest' THEN fi.created_at END DESC,
        CASE WHEN p_sort_by = 'random' THEN RANDOM() END
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.get_optimized_media_items_v3(uuid, text, text, uuid[], text, integer, integer) TO anon, authenticated, service_role;
