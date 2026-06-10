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
    v_special_pwd RECORD;
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
        -- 3.1 检查随机密码库 (daily_gallery_special_passwords)
        SELECT * INTO v_special_pwd
        FROM public.daily_gallery_special_passwords
        WHERE password = p_password
          AND (target_date IS NULL OR target_date = v_target_date)
          AND (expires_at IS NULL OR expires_at > now())
          AND (
            (password_type = 'one_time' AND is_used = false) OR 
            (password_type = 'multi_use' AND (max_usages IS NULL OR used_count < max_usages)) OR
            (password_type = 'periodic')
          )
        ORDER BY target_date DESC NULLS LAST
        LIMIT 1;

        IF v_special_pwd.id IS NOT NULL THEN
            -- 3.1.1 修复：检查是否为微信专属密码且未提供 openid
            IF v_special_pwd.source = 'wechat' THEN
                IF p_openid IS NULL OR p_openid = '' THEN
                    RETURN jsonb_build_object(
                        'success', false, 
                        'message', '该密码为公众号用户专属密码，请从微信公众号回复的链接打开', 
                        'errorCode', 'WECHAT_EXCLUSIVE_PASSWORD'
                    );
                ELSIF p_openid <> v_special_pwd.creator_id THEN
                    -- 如果 openid 不匹配
                    RETURN jsonb_build_object('success', false, 'message', '密码错误', 'errorCode', 'INVALID_PASSWORD');
                END IF;
            END IF;

            -- 校验浏览器锁定 (针对定期密码)
            IF v_special_pwd.password_type = 'periodic' AND v_special_pwd.browser_id IS NOT NULL AND v_special_pwd.browser_id <> '' THEN
                IF v_identifier IS NOT NULL AND v_identifier <> '' AND v_special_pwd.browser_id <> v_identifier THEN
                    RETURN jsonb_build_object('success', false, 'message', '密码已在其他浏览器中使用', 'errorCode', 'BROWSER_LOCKED');
                END IF;
            END IF;

            -- 更新使用记录
            UPDATE public.daily_gallery_special_passwords 
            SET used_count = COALESCE(used_count, 0) + 1, 
                is_used = CASE 
                    WHEN (password_type = 'one_time') OR (password_type = 'multi_use' AND max_usages IS NOT NULL AND COALESCE(used_count, 0) + 1 >= max_usages) 
                    THEN TRUE ELSE is_used END, 
                used_at = NOW(),
                browser_id = CASE 
                    WHEN (password_type = 'periodic' AND (browser_id IS NULL OR browser_id = '')) 
                    THEN v_identifier ELSE browser_id END
            WHERE id = v_special_pwd.id;
            
            v_expires_at := COALESCE(v_special_pwd.expires_at, now() + interval '24 hours');
        
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
            
            -- 3.5 检查用户专属密码 (公众号获取的密码) - 兜底兼容
            ELSE
                SELECT * INTO v_user_pwd
                FROM public.daily_gallery_user_passwords
                WHERE (openid = p_openid OR p_openid IS NULL)
                  AND post_date = v_target_date
                  AND password = p_password
                LIMIT 1;

                IF v_user_pwd.id IS NOT NULL THEN
                    -- 同样检查如果是专属密码但没有 openid
                    IF p_openid IS NULL OR p_openid = '' THEN
                        RETURN jsonb_build_object(
                            'success', false, 
                            'message', '该密码为公众号用户专属密码，请从微信公众号回复的链接打开', 
                            'errorCode', 'WECHAT_EXCLUSIVE_PASSWORD'
                        );
                    END IF;

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