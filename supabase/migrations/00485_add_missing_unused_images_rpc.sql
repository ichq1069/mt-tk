CREATE OR REPLACE FUNCTION public.get_random_unused_images(
    count integer
)
RETURNS SETOF public.media_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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

    RETURN QUERY
    SELECT *
    FROM public.media_items
    WHERE status::public.item_status = 'approved'::public.item_status
      AND type = 'image'
      AND is_hidden = false
      AND deleted_at IS NULL
      AND (exclude_from_daily_gallery = false OR exclude_from_daily_gallery IS NULL)
      AND COALESCE(daily_gallery_status, 'unused') = 'unused'
      AND (v_excluded_cats = '{}' OR category_id IS NULL OR NOT (category_id = ANY(v_excluded_cats)))
      AND (v_excluded_tags = '{}' OR NOT (tags && v_excluded_tags))
    ORDER BY random()
    LIMIT count;
END;
$$;
