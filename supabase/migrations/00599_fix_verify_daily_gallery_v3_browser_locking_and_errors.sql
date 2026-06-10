CREATE OR REPLACE FUNCTION public.verify_daily_gallery_v3(p_post_date text, p_password text, p_openid text DEFAULT NULL::text, p_browser_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    v_p_trimmed text;
BEGIN
    v_identifier := COALESCE(p_openid, p_browser_id);
    v_p_trimmed := TRIM(p_password);

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
    ELSIF v_p_trimmed = 'BYPASS_MP_UNLOCK' THEN
        -- 如果是小程序解锁跳过，直接通过
        v_expires_at := now() + interval '12 hours';
    ELSE
        -- 3.1 检查随机密码库 (daily_gallery_special_passwords)
        -- 先按密码查找，不限日期，为了给用户更精准的提示
        SELECT * INTO v_special_pwd
        FROM public.daily_gallery_special_passwords
        WHERE password = v_p_trimmed
        ORDER BY (target_date = v_target_date) DESC, (expires_at > now()) DESC, created_at DESC
        LIMIT 1;

        IF v_special_pwd.id IS NOT NULL THEN
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
                    'message', '访问凭据已过期（限时' || COALESCE(v_config->>'password_duration', '6') || '小时），请重新向公众号获取', 
                    'errorCode', 'PASSWORD_EXPIRED'
                );
            END IF;

            -- 3.1.3 专属密码来源校验 (针对 wechat 来源)
            IF v_special_pwd.source = 'wechat' THEN
                -- 检查是否与创建者匹配 (openid 匹配)
                IF p_openid IS NOT NULL AND p_openid <> '' AND p_openid <> v_special_pwd.creator_id THEN
                    RETURN jsonb_build_object('success', false, 'message', '该密码非您的专属密码，请获取您自己的访问凭据', 'errorCode', 'INVALID_PASSWORD');
                END IF;
            END IF;

            -- 3.1.4 校验浏览器锁定 (核心改进：多重匹配逻辑)
            IF v_special_pwd.browser_id IS NOT NULL AND v_special_pwd.browser_id <> '' THEN
                -- 如果已绑定了 browser_id，则检查当前传入的 openid 或 browser_id 是否匹配
                IF (p_openid IS NULL OR p_openid = '' OR p_openid <> v_special_pwd.browser_id) AND 
                   (p_browser_id IS NULL OR p_browser_id = '' OR p_browser_id <> v_special_pwd.browser_id) THEN
                    RETURN jsonb_build_object(
                        'success', false, 
                        'message', '该密码已在其他浏览器中使用，专属密码仅支持首个打开的浏览器', 
                        'errorCode', 'BROWSER_LOCKED'
                    );
                END IF;
            END IF;

            -- 3.1.5 检查使用次数 (one_time / multi_use)
            IF (v_special_pwd.password_type = 'one_time' AND v_special_pwd.is_used = true) OR
               (v_special_pwd.password_type = 'multi_use' AND v_special_pwd.max_usages IS NOT NULL AND v_special_pwd.used_count >= v_special_pwd.max_usages) THEN
                RETURN jsonb_build_object('success', false, 'message', '该密码使用次数已达上限', 'errorCode', 'USAGE_LIMIT_REACHED');
            END IF;

            -- 验证通过，更新记录
            UPDATE public.daily_gallery_special_passwords 
            SET used_count = COALESCE(used_count, 0) + 1, 
                is_used = CASE 
                    WHEN (password_type = 'one_time') OR (password_type = 'multi_use' AND max_usages IS NOT NULL AND COALESCE(used_count, 0) + 1 >= max_usages) 
                    THEN TRUE ELSE is_used END, 
                used_at = NOW(),
                -- 锁定 browser_id，优先存 openid
                browser_id = CASE 
                    WHEN (browser_id IS NULL OR browser_id = '') 
                    THEN v_identifier ELSE browser_id END
            WHERE id = v_special_pwd.id;
            
            v_expires_at := COALESCE(v_special_pwd.expires_at, now() + interval '24 hours');
        
        -- 3.2 检查通用配置密码
        ELSIF v_config->>'universal_password' IS NOT NULL AND v_p_trimmed = v_config->>'universal_password' THEN
            v_expires_at := now() + interval '24 hours';

        -- 3.3 检查帖子自带的原始密码
        ELSIF v_correct_password = v_p_trimmed THEN
            v_expires_at := now() + interval '2 hours';

        -- 3.4 检查多公众号独立密码
        ELSE
            SELECT id INTO v_account_pwd_id
            FROM public.daily_gallery_account_passwords
            WHERE post_id = v_post_id
              AND password = v_p_trimmed
            LIMIT 1;

            IF v_account_pwd_id IS NOT NULL THEN
                v_expires_at := now() + interval '24 hours';
            
            -- 3.5 兜底检查旧的 daily_gallery_user_passwords 表
            ELSE
                SELECT * INTO v_user_pwd
                FROM public.daily_gallery_user_passwords
                WHERE password = v_p_trimmed
                ORDER BY (post_date = v_target_date) DESC, post_date DESC
                LIMIT 1;

                IF v_user_pwd.id IS NOT NULL THEN
                    IF v_user_pwd.post_date <> v_target_date THEN
                         RETURN jsonb_build_object('success', false, 'message', '该密码仅适用于 ' || v_user_pwd.post_date || ' 的图集内容，请获取今日正确密码', 'errorCode', 'DATE_MISMATCH');
                    END IF;

                    IF v_user_pwd.expires_at <= now() THEN
                        RETURN jsonb_build_object('success', false, 'message', '访问凭据已过期，请重新获取', 'errorCode', 'PASSWORD_EXPIRED');
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
            'expiresAt', v_expires_at
        )
    );
END;
$function$