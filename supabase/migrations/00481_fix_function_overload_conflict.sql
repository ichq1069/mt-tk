-- Drop both versions to clear the ambiguity
DROP FUNCTION IF EXISTS public.get_daily_gallery_available_images_rpc(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.get_daily_gallery_available_images_rpc(text, integer, integer, text);

-- Recreate a single, consistent version
CREATE OR REPLACE FUNCTION public.get_daily_gallery_available_images_rpc(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total bigint;
    v_excluded_cats uuid[];
    v_excluded_tags text[];
BEGIN
    -- Get exclusion settings from system config
    SELECT 
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_categories'))::uuid[], '{}'::uuid[]),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_tags'))::text[], '{}'::text[])
    INTO v_excluded_cats, v_excluded_tags
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';

    -- First calculate total count
    SELECT count(*) INTO v_total
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
        AND m.is_hidden = false
        AND m.type = 'image'
        AND m.deleted_at IS NULL
        AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
        AND COALESCE(m.daily_gallery_status, 'unused') = p_status
        AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
        AND (v_excluded_cats = '{}' OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_cats)))
        AND (v_excluded_tags = '{}' OR NOT (m.tags && v_excluded_tags));

    RETURN QUERY
    SELECT 
        m.id, 
        m.url, 
        m.title, 
        m.description, 
        m.status::text, 
        COALESCE(m.daily_gallery_status, 'unused')::text as daily_gallery_status,
        m.created_at,
        v_total
    FROM public.media_items m
    WHERE m.status::public.item_status = 'approved'::public.item_status
        AND m.is_hidden = false
        AND m.type = 'image'
        AND m.deleted_at IS NULL
        AND (m.exclude_from_daily_gallery = false OR m.exclude_from_daily_gallery IS NULL)
        AND COALESCE(m.daily_gallery_status, 'unused') = p_status
        AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
        AND (v_excluded_cats = '{}' OR m.category_id IS NULL OR NOT (m.category_id = ANY(v_excluded_cats)))
        AND (v_excluded_tags = '{}' OR NOT (m.tags && v_excluded_tags))
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
