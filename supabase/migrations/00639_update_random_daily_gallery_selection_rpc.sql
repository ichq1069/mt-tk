CREATE OR REPLACE FUNCTION public.get_random_daily_gallery_images(
    p_count integer,
    p_excluded_categories uuid[] DEFAULT '{}'::uuid[],
    p_excluded_tags text[] DEFAULT '{}'::text[]
)
RETURNS SETOF media_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_fifteen_days_ago timestamp with time zone := now() - interval '15 days';
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.media_items
    WHERE status::public.item_status = 'approved'::public.item_status
      AND type = 'image'
      AND is_hidden = false
      AND deleted_at IS NULL
      AND (exclude_from_daily_gallery = false OR exclude_from_daily_gallery IS NULL)
      AND (p_excluded_categories = '{}' OR category_id IS NULL OR NOT (category_id = ANY(p_excluded_categories)))
      AND (p_excluded_tags = '{}' OR NOT (tags && p_excluded_tags))
      -- 15-day Wechat rule
      AND (
          wechat_draft_status = 'available' 
          OR wechat_draft_status IS NULL 
          OR (wechat_draft_status IN ('used', 'adopted') AND (wechat_last_used_at IS NULL OR wechat_last_used_at < v_fifteen_days_ago))
      )
    ORDER BY 
        -- 尽量使用微信公众号的草稿库素材中已入稿库以外的图片
        (CASE WHEN wechat_draft_status = 'available' OR wechat_draft_status IS NULL THEN 0 ELSE 1 END) ASC,
        -- 优先使用时间靠前的图片
        created_at ASC
    LIMIT p_count;
END;
$function$;
