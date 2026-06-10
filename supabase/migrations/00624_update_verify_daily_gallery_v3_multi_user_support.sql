CREATE OR REPLACE FUNCTION public.verify_daily_gallery_v3(
    p_post_date text,
    p_password text,
    p_openid text DEFAULT NULL,
    p_browser_id text DEFAULT NULL,
    p_ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post_id uuid;
    v_image_ids uuid[];
    v_correct_password text;
    v_special_pwd RECORD;
    v_user_pwd RECORD;
    v_account_pwd_id uuid;
    v_images jsonb;
    v_expires_at timestamptz;
    v_config jsonb;
    v_enable_password boolean;
    v_allow_multi_user boolean;
    v_target_date date;
    v_identifier text;
    v_p_trimmed text;
    v_user_lock RECORD;
    v_password_type text := 'unknown';
BEGIN
    -- 规范化输入
    v_p_trimmed := TRIM(p_password);
    
    -- 默认标识符：优先使用浏览器指纹，其次是 openid
    v_identifier := COALESCE(NULLIF(TRIM(p_browser_id), ''), NULLIF(TRIM(p_openid), ''));

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
    v_allow_multi_user := COALESCE((v_config->>'allow_multiple_users_per_browser')::boolean, false);

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
        v_expires_at := now() + interval '24 hours';
        v_password_type := 'free';
    ELSIF v_p_trimmed = 'BYPASS_MP_UNLOCK' THEN
        v_expires_at := now() + interval '12 hours';
        v_password_type := 'ad_unlock';
    ELSE
        -- 3.1 检查随机密码库 (daily_gallery_special_passwords)
        SELECT * INTO v_special_pwd
        FROM public.daily_gallery_special_passwords
        WHERE password = v_p_trimmed
        ORDER BY (target_date = v_target_date) DESC, (expires_at > now()) DESC, created_at DESC
        LIMIT 1;

        IF v_special_pwd.id IS NOT NULL THEN
            v_password_type := 'special:' || v_special_pwd.password_type;
            
            -- 3.1.1 检查日期是否匹配
            IF v_special_pwd.target_date IS NOT NULL AND v_special_pwd.target_date <> v_target_date THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'message', '该密码仅适用于 ' || v_special_pwd.target_date || ' 的图集内容，请获取今日正确密码', 
                    'errorCode', 'DATE_MISMATCH'
                );
            END IF;

            -- 3.1.2 检查是否过期
            IF v_special_pwd.expires_at IS NOT NULL AND v_special_pwd.expires_at <= now() THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'message', '访问凭据已过期，请重新向公众号获取', 
                    'errorCode', 'PASSWORD_EXPIRED'
                );
            END IF;

            -- 3.1.3 专属校验
            IF v_special_pwd.source = 'wechat' AND v_special_pwd.password_type IN ('periodic_single_user', 'periodic_multi_user') THEN
                IF p_openid IS NOT NULL AND p_openid <> '' AND p_openid <> v_special_pwd.creator_id THEN
                    RETURN jsonb_build_object(
                        'success', false, 
                        'message', '该密码非您的专属密码，请获取您自己的访问凭据', 
                        'errorCode', 'WECHAT_EXCLUSIVE_PASSWORD'
                    );
                END IF;
            END IF;

            -- 3.1.4 根据密码类型执行逻辑
            IF v_special_pwd.password_type = 'one_time' THEN
                IF v_special_pwd.is_used = true THEN
                    RETURN jsonb_build_object('success', false, 'message', '该密码已被使用', 'errorCode', 'USAGE_LIMIT_REACHED');
                END IF;
                UPDATE public.daily_gallery_special_passwords 
                SET is_used = true, used_at = NOW(), used_count = COALESCE(used_count, 0) + 1
                WHERE id = v_special_pwd.id;
            ELSIF v_special_pwd.password_type IN ('periodic_single_user', 'periodic_multi_user') THEN
                IF v_special_pwd.password_type = 'periodic_multi_user' AND p_ip_address IS NOT NULL AND p_ip_address <> '' THEN
                    v_identifier := TRIM(p_ip_address);
                END IF;

                IF v_allow_multi_user = false THEN
                    IF v_special_pwd.password_type = 'periodic_single_user' THEN
                        SELECT * INTO v_user_lock
                        FROM public.daily_gallery_password_user_locks
                        WHERE password_id = v_special_pwd.id
                        LIMIT 1;
                    ELSE
                        SELECT * INTO v_user_lock
                        FROM public.daily_gallery_password_user_locks
                        WHERE password_id = v_special_pwd.id
                          AND user_identifier = v_identifier
                        LIMIT 1;
                    END IF;

                    IF v_user_lock.id IS NOT NULL THEN
                        IF v_user_lock.user_identifier <> v_identifier THEN
                            RETURN jsonb_build_object(
                                'success', false, 
                                'message', '该密码已在其他设备或浏览器激活，专属密码仅支持首个打开的设备。', 
                                'errorCode', 'BROWSER_LOCKED'
                            );
                        END IF;
                    ELSE
                        INSERT INTO public.daily_gallery_password_user_locks (password_id, user_identifier, browser_id)
                        VALUES (v_special_pwd.id, v_identifier, v_identifier);
                    END IF;
                END IF;
                
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, used_at = NOW()
                WHERE id = v_special_pwd.id;
            ELSIF v_special_pwd.password_type = 'multi_use' THEN
                IF v_special_pwd.max_usages IS NOT NULL AND v_special_pwd.used_count >= v_special_pwd.max_usages THEN
                    RETURN jsonb_build_object('success', false, 'message', '该密码使用次数已达上限', 'errorCode', 'USAGE_LIMIT_REACHED');
                END IF;
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, 
                    is_used = CASE WHEN max_usages IS NOT NULL AND COALESCE(used_count, 0) + 1 >= max_usages THEN TRUE ELSE is_used END,
                    used_at = NOW()
                WHERE id = v_special_pwd.id;
            ELSIF v_special_pwd.password_type = 'long_term' THEN
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, used_at = NOW()
                WHERE id = v_special_pwd.id;
            END IF;
            
            v_expires_at := COALESCE(v_special_pwd.expires_at, now() + interval '24 hours');
        
        -- 3.2 检查通用配置密码
        ELSIF v_config->>'universal_password' IS NOT NULL AND v_p_trimmed = v_config->>'universal_password' THEN
            v_expires_at := now() + interval '24 hours';
            v_password_type := 'universal';

        -- 3.3 检查帖子自带的原始密码
        ELSIF v_correct_password = v_p_trimmed THEN
            v_expires_at := now() + interval '2 hours';
            v_password_type := 'post_fixed';

        -- 3.4 检查其他类型密码
        ELSE
            SELECT id INTO v_account_pwd_id
            FROM public.daily_gallery_account_passwords
            WHERE post_id = v_post_id
              AND password = v_p_trimmed
            LIMIT 1;

            IF v_account_pwd_id IS NOT NULL THEN
                v_expires_at := now() + interval '24 hours';
                v_password_type := 'account';
            ELSE
                SELECT * INTO v_user_pwd
                FROM public.daily_gallery_user_passwords
                WHERE password = v_p_trimmed
                ORDER BY (post_date = v_target_date) DESC, post_date DESC
                LIMIT 1;

                IF v_user_pwd.id IS NOT NULL THEN
                    v_password_type := 'user_fixed';
                    IF v_user_pwd.post_date <> v_target_date THEN
                         RETURN jsonb_build_object('success', false, 'message', '该密码仅适用于 ' || v_user_pwd.post_date || ' 的图集内容，请获取今日正确密码', 'errorCode', 'DATE_MISMATCH');
                    END IF;
                    IF v_user_pwd.expires_at <= now() THEN
                        RETURN jsonb_build_object('success', false, 'message', '访问凭据已过期，请重新获取', 'errorCode', 'PASSWORD_EXPIRED');
                    END IF;

                    IF v_allow_multi_user = false THEN
                        IF v_user_pwd.locked_browser_id IS NOT NULL AND v_user_pwd.locked_browser_id <> '' THEN
                            IF v_identifier IS NULL OR v_identifier = '' OR v_user_pwd.locked_browser_id <> v_identifier THEN
                                RETURN jsonb_build_object(
                                    'success', false, 
                                    'message', '该密码已在其他设备或浏览器激活，专属密码仅支持首个打开的设备。', 
                                    'errorCode', 'BROWSER_LOCKED'
                                );
                            END IF;
                        END IF;

                        UPDATE public.daily_gallery_user_passwords
                        SET locked_browser_id = CASE 
                            WHEN (locked_browser_id IS NULL OR locked_browser_id = '') 
                            THEN v_identifier ELSE locked_browser_id END
                        WHERE id = v_user_pwd.id;
                    END IF;

                    v_expires_at := v_user_pwd.expires_at;
                ELSE
                    RETURN jsonb_build_object('success', false, 'message', '密码不正确，请重新获取今日访问凭证', 'errorCode', 'INVALID_PASSWORD');
                END IF;
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
            'expiresAt', v_expires_at,
            'passwordType', v_password_type
        )
    );
END;
$$;