CREATE OR REPLACE FUNCTION verify_daily_gallery_v3(
  p_post_date text,
  p_password text,
  p_openid text,
  p_browser_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post_id uuid;
    v_image_ids uuid[];
    v_correct_password text;
    v_special_id uuid;
    v_images jsonb;
    v_expires_at timestamptz;
BEGIN
    -- 1. 获取帖子信息
    SELECT id, password, image_ids 
    INTO v_post_id, v_correct_password, v_image_ids
    FROM public.daily_gallery_posts
    WHERE post_date = p_post_date;

    IF v_post_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '该日期没有发布内容');
    END IF;

    -- 2. 验证密码
    IF p_password = 'BYPASS_MP_UNLOCK' THEN
        -- 如果是小程序解锁跳过，默认通过（调用方应先校验 ad_unlock_logs）
        v_expires_at := now() + interval '12 hours';
    ELSE
        -- 2.1 检查特权/一次性密码
        SELECT id INTO v_special_id
        FROM public.daily_gallery_special_passwords
        WHERE password = p_password
          AND (target_date IS NULL OR target_date = p_post_date)
          AND (expires_at IS NULL OR expires_at > now())
          AND (is_one_time = false OR (is_one_time = true AND usages < max_usages))
        LIMIT 1;

        IF v_special_id IS NOT NULL THEN
            UPDATE public.daily_gallery_special_passwords
            SET usages = usages + 1, last_used_at = now()
            WHERE id = v_special_id;
            
            v_expires_at := now() + interval '24 hours';
        ELSIF v_correct_password = p_password THEN
            v_expires_at := now() + interval '2 hours';
        ELSE
            -- 检查通用密码
            DECLARE
                v_universal_password text;
            BEGIN
                SELECT value->>'universal_password' INTO v_universal_password
                FROM public.system_configs
                WHERE key = 'daily_gallery_config';
                
                IF v_universal_password IS NOT NULL AND p_password = v_universal_password THEN
                    v_expires_at := now() + interval '24 hours';
                ELSE
                    RETURN jsonb_build_object('success', false, 'message', '密码错误');
                END IF;
            END;
        END IF;
    END IF;

    -- 3. 获取图片详情
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
$$;