DROP FUNCTION IF EXISTS public.release_orphaned_daily_gallery_images();
DROP FUNCTION IF EXISTS public.auto_refill_pending_daily_gallery_images();

-- 1. 释放无发布记录图片
CREATE OR REPLACE FUNCTION public.release_orphaned_daily_gallery_images()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.media_items m
    SET daily_gallery_status = 'unused'
    WHERE daily_gallery_status = 'used'
      AND NOT EXISTS (
          SELECT 1 FROM public.daily_gallery_posts p 
          WHERE m.id = ANY(p.image_ids)
      );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('已成功释放 %s 个无发布记录的素材回到待使用库', v_count),
        'count', v_count
    );
END;
$$;

-- 2. 自动补充待发布库
CREATE OR REPLACE FUNCTION public.auto_refill_pending_daily_gallery_images()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit integer;
    v_current integer;
    v_needed integer;
    v_count integer;
    v_excluded_cats uuid[];
    v_excluded_tags text[];
BEGIN
    -- 获取限制数量（从配置获取，默认5）
    SELECT COALESCE((value->>'daily_count')::integer, 5) INTO v_limit
    FROM public.system_configs WHERE key = 'daily_gallery_config';
    
    -- 获取排除配置
    SELECT 
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_categories'))::uuid[], '{}'::uuid[]),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_tags'))::text[], '{}'::text[])
    INTO v_excluded_cats, v_excluded_tags
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';

    -- 当前待发布数量
    SELECT count(*) INTO v_current FROM public.media_items 
    WHERE daily_gallery_status::public.item_status = 'pending'::public.item_status AND deleted_at IS NULL;
    
    v_needed := v_limit - v_current;
    
    IF v_needed <= 0 THEN
        RETURN jsonb_build_object('success', true, 'message', '待发布库已满，无需补充');
    END IF;

    -- 补充
    WITH to_update AS (
        SELECT id FROM public.media_items
        WHERE status::public.item_status = 'approved'::public.item_status
            AND is_hidden = false
            AND type = 'image'
            AND deleted_at IS NULL
            AND (exclude_from_daily_gallery = false OR exclude_from_daily_gallery IS NULL)
            AND COALESCE(daily_gallery_status, 'unused') = 'unused'
            AND (v_excluded_cats = '{}' OR category_id IS NULL OR NOT (category_id = ANY(v_excluded_cats)))
            AND (v_excluded_tags = '{}' OR NOT (tags && v_excluded_tags))
        ORDER BY created_at DESC
        LIMIT v_needed
    )
    UPDATE public.media_items m
    SET daily_gallery_status::public.item_status = 'pending'::public.item_status
    FROM to_update
    WHERE m.id = to_update.id;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true, 
        'message', format('已自动补充 %s 个素材到待发布库', v_count),
        'count', v_count
    );
END;
$$;
