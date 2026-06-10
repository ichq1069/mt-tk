
-- 先删除原函数
DROP FUNCTION IF EXISTS public.get_daily_gallery_available_images_rpc(integer, integer, text, text);

-- 获取并重新创建带有排除逻辑的 RPC
CREATE OR REPLACE FUNCTION public.get_daily_gallery_available_images_rpc(
    p_limit integer,
    p_offset integer,
    p_search text DEFAULT NULL,
    p_status text DEFAULT 'unused'
)
RETURNS TABLE (
    id uuid,
    url text,
    title text,
    description text,
    status text,
    daily_gallery_status text,
    created_at timestamp with time zone,
    total_count bigint
) AS $$
DECLARE
    v_excluded_cats uuid[];
    v_excluded_tags text[];
BEGIN
    -- 从系统配置中获取排除设置
    SELECT 
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_categories'))::uuid[], '{}'::uuid[]),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_tags'))::text[], '{}'::text[])
    INTO v_excluded_cats, v_excluded_tags
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';

    RETURN QUERY
    WITH filtered_images AS (
        SELECT 
            m.id, 
            m.url, 
            m.title, 
            m.description, 
            m.status::text, 
            COALESCE(m.daily_gallery_status, 'unused')::text as daily_gallery_status,
            m.created_at
        FROM public.media_items m
        WHERE m.status::public.item_status = 'approved'::public.item_status
            AND m.is_hidden = false
            AND m.type = 'image'
            AND m.deleted_at IS NULL
            AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
            AND COALESCE(m.daily_gallery_status, 'unused') = p_status
            AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
            -- 应用分类排除
            AND (v_excluded_cats = '{}' OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_cats)))
            -- 应用标签排除
            AND (v_excluded_tags = '{}' OR NOT (m.tags && v_excluded_tags))
            -- 排除已在发布记录中的图片
            AND NOT EXISTS (
                SELECT 1 FROM public.daily_gallery_posts p 
                WHERE m.id = ANY(p.image_ids)
            )
    )
    SELECT 
        f.id, f.url, f.title, f.description, f.status, f.daily_gallery_status, f.created_at,
        (SELECT count(*) FROM filtered_images) AS total_count
    FROM filtered_images f
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
