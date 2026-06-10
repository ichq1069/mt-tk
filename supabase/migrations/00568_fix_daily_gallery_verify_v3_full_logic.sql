-- 再次优化 verify_daily_gallery_v3
-- 1. 正确更新 used_count, used_at, is_used
-- 2. 处理 max_usages = 0 的情况为 1
-- 3. 确保 logic 兼容 is_one_time
CREATE OR REPLACE FUNCTION public.verify_daily_gallery_v3(p_post_date text, p_password text, p_openid text, p_browser_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_post_id uuid;
    v_image_ids uuid[];
    v_correct_password text;
    v_special_id uuid;
    v_special_is_one_time boolean;
    v_special_max_usages integer;
    v_special_used_count integer;
    v_images jsonb;
    v_expires_at timestamptz;
    v_config jsonb;
    v_enable_password boolean;
    v_target_date date;
BEGIN
    -- 尝试转换为日期类型
    BEGIN
        v_target_date := p_post_date::date;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', '日期格式不正确');
    END;

    -- 1. 获取全局配置
    SELECT value INTO v_config
    FROM public.system_configs
    WHERE key = 'daily_gallery_config';
    
    v_enable_password := COALESCE((v_config->>'enable_password')::boolean, true);

    -- 2. 获取帖子信息
    SELECT id, password, image_ids 
    INTO v_post_id, v_correct_password, v_image_ids
    FROM public.daily_gallery_posts
    WHERE post_date = v_target_date;

    IF v_post_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '该日期没有发布内容');
    END IF;

    -- 3. 验证逻辑
    IF v_enable_password = false AND p_password IS NULL THEN
        v_expires_at := now() + interval '24 hours';
    ELSIF p_password = 'BYPASS_MP_UNLOCK' THEN
        v_expires_at := now() + interval '12 hours';
    ELSE
        -- 3.1 检查特权/一次性密码
        SELECT id, is_one_time, max_usages, used_count 
        INTO v_special_id, v_special_is_one_time, v_special_max_usages, v_special_used_count
        FROM public.daily_gallery_special_passwords
        WHERE password = p_password
          AND (target_date IS NULL OR target_date = v_target_date)
          AND (expires_at IS NULL OR expires_at > now())
          AND (is_used = false OR is_used IS NULL)
          AND (
            is_one_time = false 
            OR (is_one_time = true AND COALESCE(used_count, 0) < COALESCE(NULLIF(max_usages, 0), 1))
          )
        LIMIT 1;

        IF v_special_id IS NOT NULL THEN
            -- 更新使用情况
            UPDATE public.daily_gallery_special_passwords
            SET 
                used_count = COALESCE(used_count, 0) + 1, 
                used_at = now(),
                is_used = CASE 
                    WHEN is_one_time = true AND (COALESCE(used_count, 0) + 1) >= COALESCE(NULLIF(max_usages, 0), 1) THEN true
                    ELSE false
                END
            WHERE id = v_special_id;
            
            v_expires_at := now() + interval '24 hours';
        ELSIF v_correct_password = p_password THEN
            v_expires_at := now() + interval '2 hours';
        ELSIF v_config->>'universal_password' IS NOT NULL AND p_password = v_config->>'universal_password' THEN
            v_expires_at := now() + interval '24 hours';
        ELSIF v_enable_password = false THEN
            v_expires_at := now() + interval '24 hours';
        ELSE
            RETURN jsonb_build_object('success', false, 'message', '密码错误', 'errorCode', 'INVALID_PASSWORD');
        END IF;
    END IF;

    -- 4. 获取图片详情
    SELECT jsonb_agg(m) INTO v_images
    FROM (
        SELECT * FROM public.media_items
        WHERE id = ANY(v_image_ids)
    ) m;

    RETURN jsonb_build_object(
        'success', true, 
        'message', '验证成功', 
        'data', jsonb_build_object(
            'postId', v_post_id,
            'images', COALESCE(v_images, '[]'::jsonb),
            'expiresAt', v_expires_at
        )
    );
END;
$function$;
