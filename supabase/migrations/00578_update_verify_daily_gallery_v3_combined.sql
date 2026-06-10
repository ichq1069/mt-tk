CREATE OR REPLACE FUNCTION public.verify_daily_gallery_v3(p_post_date text, p_password text DEFAULT NULL::text, p_openid text DEFAULT NULL::text, p_browser_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_post_id uuid;
    v_image_ids uuid[];
    v_correct_password text;
    v_special_id uuid;
    v_user_pwd RECORD;
    v_account_pwd_id uuid;
    v_images jsonb;
    v_expires_at timestamptz;
    v_config jsonb;
    v_enable_password boolean;
    v_target_date date;
    v_identifier text;
BEGIN
    v_identifier := COALESCE(p_openid, p_browser_id);

    -- 尝试转换为日期类型
    BEGIN
        v_target_date := p_post_date::date;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', '日期格式不正确', 'errorCode', 'INVALID_DATE');
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
    WHERE post_date = v_target_date
      AND is_published = true;

    IF v_post_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '该日期还没有发布内容哦', 'errorCode', 'POST_NOT_FOUND');
    END IF;

    -- 3. 验证逻辑
    IF v_enable_password = false THEN
        -- 如果禁用了密码，直接通过
        v_expires_at := now() + interval '24 hours';
    ELSIF p_password = 'BYPASS_MP_UNLOCK' THEN
        -- 如果是小程序解锁跳过，直接通过
        v_expires_at := now() + interval '12 hours';
    ELSE
        -- 3.1 检查特权/一次性密码
        SELECT id INTO v_special_id
        FROM public.daily_gallery_special_passwords
        WHERE password = p_password
          AND (target_date IS NULL OR target_date = v_target_date)
          AND (expires_at IS NULL OR expires_at > now())
          AND (is_one_time = false OR (is_one_time = true AND used_count < COALESCE(NULLIF(max_usages, 0), 1)))
        LIMIT 1;

        IF v_special_id IS NOT NULL THEN
            UPDATE public.daily_gallery_special_passwords
            SET used_count = used_count + 1, used_at = now()
            WHERE id = v_special_id;
            v_expires_at := now() + interval '24 hours';
        
        -- 3.2 检查通用密码
        ELSIF v_config->>'universal_password' IS NOT NULL AND p_password = v_config->>'universal_password' THEN
            v_expires_at := now() + interval '24 hours';

        -- 3.3 检查帖子自带的随机密码
        ELSIF v_correct_password = p_password THEN
            v_expires_at := now() + interval '2 hours';

        -- 3.4 检查多公众号独立密码
        ELSE
            SELECT id INTO v_account_pwd_id
            FROM public.daily_gallery_account_passwords
            WHERE post_id = v_post_id
              AND password = p_password
            LIMIT 1;

            IF v_account_pwd_id IS NOT NULL THEN
                v_expires_at := now() + interval '24 hours';
            
            -- 3.5 检查用户专属密码 (公众号获取的密码)
            ELSIF p_openid IS NOT NULL AND p_openid <> '' THEN
                SELECT * INTO v_user_pwd
                FROM public.daily_gallery_user_passwords
                WHERE openid = p_openid
                  AND post_date = v_target_date
                  AND password = p_password
                LIMIT 1;

                IF v_user_pwd.id IS NOT NULL THEN
                    -- 检查是否过期
                    IF v_user_pwd.expires_at <= now() THEN
                        RETURN jsonb_build_object('success', false, 'message', '密码已过期，请重新获取', 'errorCode', 'PASSWORD_EXPIRED');
                    END IF;

                    -- 检查浏览器锁定
                    IF p_browser_id IS NOT NULL AND p_browser_id <> '' THEN
                        IF v_user_pwd.locked_browser_id IS NULL OR v_user_pwd.locked_browser_id = '' THEN
                            UPDATE public.daily_gallery_user_passwords SET locked_browser_id = p_browser_id WHERE id = v_user_pwd.id;
                            v_expires_at := v_user_pwd.expires_at;
                        ELSIF v_user_pwd.locked_browser_id NOT LIKE '%' || p_browser_id || '%' THEN
                            RETURN jsonb_build_object('success', false, 'message', '密码已在其他浏览器中使用', 'errorCode', 'BROWSER_LOCKED');
                        ELSE
                            v_expires_at := v_user_pwd.expires_at;
                        END IF;
                    ELSE
                        v_expires_at := v_user_pwd.expires_at;
                    END IF;
                ELSE
                    RETURN jsonb_build_object('success', false, 'message', '密码错误', 'errorCode', 'INVALID_PASSWORD');
                END IF;
            ELSE
                -- 如果没有 openid，且前面都没匹配上，那就是密码错误
                RETURN jsonb_build_object('success', false, 'message', '密码错误', 'errorCode', 'INVALID_PASSWORD');
            END IF;
        END IF;
    END IF;

    -- 4. 获取图片详情
    SELECT jsonb_agg(m) INTO v_images
    FROM (
        SELECT * FROM public.media_items
        WHERE id = ANY(v_image_ids)
        AND deleted_at IS NULL
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