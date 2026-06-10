CREATE OR REPLACE FUNCTION public.auto_refill_pending_daily_gallery_materials()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_limit integer;
    v_total_pending integer;
    v_invalid_pending integer;
    v_current_valid integer;
    v_needed integer;
    v_refilled_count integer;
    v_excluded_cats uuid[];
    v_excluded_tags text[];
    v_fifteen_days_ago timestamp with time zone := now() - interval '15 days';
    v_message text;
    v_start_time timestamp with time zone := now();
BEGIN
    -- Get daily count limit from configuration (default to 5)
    SELECT COALESCE((value->>'daily_count')::integer, 5) INTO v_limit
    FROM public.system_configs WHERE key = 'daily_gallery_config';
    
    -- Get exclusion settings from system config
    SELECT 
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_categories'))::uuid[], '{}'::uuid[]),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(value->'excluded_tags'))::text[], '{}'::text[])
    INTO v_excluded_cats, v_excluded_tags
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';

    -- 1. 统计当前待发布库的总数 (包含不合规的)
    SELECT count(*) INTO v_total_pending 
    FROM public.media_items 
    WHERE daily_gallery_status = 'pending';

    -- 2. 识别并清理不合规的待发布素材
    WITH invalid_items AS (
        SELECT id FROM public.media_items
        WHERE daily_gallery_status = 'pending'
          AND (
              deleted_at IS NOT NULL
              OR is_hidden = true
              OR status::text != 'approved'
              OR type != 'image'
              OR (exclude_from_daily_gallery = true)
              OR (v_excluded_cats != '{}' AND category_id = ANY(v_excluded_cats))
              OR (v_excluded_tags != '{}' AND tags && v_excluded_tags)
              OR (wechat_draft_status IN ('used', 'adopted') AND wechat_last_used_at IS NOT NULL AND wechat_last_used_at >= v_fifteen_days_ago)
          )
    )
    UPDATE public.media_items m
    SET daily_gallery_status = 'unused'
    FROM invalid_items
    WHERE m.id = invalid_items.id;
    
    GET DIAGNOSTICS v_invalid_pending = ROW_COUNT;

    -- 3. 统计清理后剩余的合格素材
    SELECT count(*) INTO v_current_valid 
    FROM public.media_items 
    WHERE daily_gallery_status = 'pending'
      AND deleted_at IS NULL;
    
    v_needed := v_limit - v_current_valid;
    
    IF v_needed <= 0 THEN
        v_message := format('待发布库分析 - 总数:%s, 合格:%s, 清理失效:%s。无需补充。', v_total_pending, v_current_valid, v_invalid_pending);
        -- Log the result
        INSERT INTO public.scheduled_task_logs (task_name, status, message, execution_time, duration_ms)
        VALUES ('daily_gallery_auto_publish', 'success', v_message, v_start_time, extract(epoch from (now() - v_start_time)) * 1000);
        
        RETURN jsonb_build_object('success', true, 'message', v_message);
    END IF;

    -- 4. 从备选池补充缺失的素材 (包含 unused 和 available)
    WITH to_update AS (
        SELECT id FROM public.media_items
        WHERE status::text = 'approved'
            AND is_hidden = false
            AND type = 'image'
            AND deleted_at IS NULL
            AND (exclude_from_daily_gallery = false OR exclude_from_daily_gallery IS NULL)
            AND COALESCE(daily_gallery_status, 'unused') IN ('unused', 'available')
            AND (v_excluded_cats = '{}' OR category_id IS NULL OR NOT (category_id = ANY(v_excluded_cats)))
            AND (v_excluded_tags = '{}' OR NOT (tags && v_excluded_tags))
            -- 15-day Wechat rule
            AND (
                wechat_draft_status = 'available' 
                OR wechat_draft_status IS NULL 
                OR (wechat_last_used_at IS NULL OR wechat_last_used_at < v_fifteen_days_ago)
            )
        ORDER BY 
            -- 尽量使用微信公众号的草稿库素材中已入稿库以外的图片
            (CASE WHEN wechat_draft_status = 'available' OR wechat_draft_status IS NULL THEN 0 ELSE 1 END) ASC,
            -- 优先使用时间靠前的图片
            created_at ASC
        LIMIT v_needed
    )
    UPDATE public.media_items m
    SET daily_gallery_status = 'pending'
    FROM to_update
    WHERE m.id = to_update.id;

    GET DIAGNOSTICS v_refilled_count = ROW_COUNT;
    
    v_message := format('待发布库补充分析 - 总数:%s, 合格:%s, 清理失效:%s, 实际补齐:%s (目标:%s, 需补:%s)', 
                        v_total_pending, v_current_valid, v_invalid_pending, v_refilled_count, v_limit, v_needed);

    -- Log the result
    INSERT INTO public.scheduled_task_logs (task_name, status, message, execution_time, duration_ms)
    VALUES ('daily_gallery_auto_publish', 'success', v_message, v_start_time, extract(epoch from (now() - v_start_time)) * 1000);

    RETURN jsonb_build_object(
        'success', true, 
        'message', v_message,
        'count', v_refilled_count
    );
END;
$function$
