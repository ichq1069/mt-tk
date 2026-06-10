CREATE OR REPLACE FUNCTION public.verify_daily_gallery_v3(p_post_date text, p_password text, p_openid text DEFAULT NULL::text, p_browser_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    v_user_lock RECORD;
BEGIN
    -- 规范化输入
    v_p_trimmed := TRIM(p_password);
    -- 标识符优先级：首选 openid（更稳定），次选 browser_id（浏览器指纹）
    v_identifier := COALESCE(NULLIF(TRIM(p_openid), ''), NULLIF(TRIM(p_browser_id), ''));

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
        v_expires_at := now() + interval '24 hours';
    ELSIF v_p_trimmed = 'BYPASS_MP_UNLOCK' THEN
        v_expires_at := now() + interval '12 hours';
    ELSE
        -- 3.1 检查随机密码库 (daily_gallery_special_passwords)
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
                    'message', '访问凭据已过期，请重新向公众号获取', 
                    'errorCode', 'PASSWORD_EXPIRED'
                );
            END IF;

            -- 3.1.3 单用户密码专属校验 (仅针对从微信来源生成的密码，需匹配申请者的 openid)
            -- 后台生成的密码 (source='backend') 不受此限，可发放给任何用户使用
            IF v_special_pwd.source = 'wechat' THEN
                IF p_openid IS NOT NULL AND p_openid <> '' AND p_openid <> v_special_pwd.creator_id THEN
                    RETURN jsonb_build_object(
                        'success', false, 
                        'message', '该密码非您的专属密码，请获取您自己的访问凭据', 
                        'errorCode', 'WECHAT_EXCLUSIVE_PASSWORD'
                    );
                END IF;
            END IF;

            -- 3.1.4 根据密码类型执行不同的锁定和使用逻辑
            -- 类型 1: one_time（一次性）
            IF v_special_pwd.password_type = 'one_time' THEN
                IF v_special_pwd.is_used = true THEN
                    RETURN jsonb_build_object('success', false, 'message', '该密码已被使用', 'errorCode', 'USAGE_LIMIT_REACHED');
                END IF;
                UPDATE public.daily_gallery_special_passwords 
                SET is_used = true, used_at = NOW(), used_count = COALESCE(used_count, 0) + 1
                WHERE id = v_special_pwd.id;

            -- 类型 2 & 3: periodic_single_user / periodic_multi_user（定期密码，激活锁定）
            ELSIF v_special_pwd.password_type IN ('periodic_single_user', 'periodic_multi_user') THEN
                IF v_special_pwd.password_type = 'periodic_single_user' THEN
                    -- 单用户定期密码：该密码仅供第一个激活它的用户/设备使用（全局唯一锁定）
                    SELECT * INTO v_user_lock
                    FROM public.daily_gallery_password_user_locks
                    WHERE password_id = v_special_pwd.id
                    LIMIT 1;
                ELSE
                    -- 多用户定期密码：允许多人使用，但每个人仅限在自己首个激活的设备上使用（按用户标识锁定）
                    SELECT * INTO v_user_lock
                    FROM public.daily_gallery_password_user_locks
                    WHERE password_id = v_special_pwd.id
                      AND user_identifier = v_identifier
                    LIMIT 1;
                END IF;

                IF v_user_lock.id IS NOT NULL THEN
                    -- 已有锁定记录，检查当前访问者是否匹配
                    -- 注意：这里校验的是 user_identifier，即首个激活时的 openid 或 browser_id
                    IF v_user_lock.user_identifier <> v_identifier THEN
                        RETURN jsonb_build_object(
                            'success', false, 
                            'message', '该密码已在其他设备或浏览器激活，专属密码仅支持首个打开的设备。', 
                            'errorCode', 'BROWSER_LOCKED'
                        );
                    END IF;
                ELSE
                    -- 尚未锁定，进行首次激活
                    INSERT INTO public.daily_gallery_password_user_locks (password_id, user_identifier, browser_id)
                    VALUES (v_special_pwd.id, v_identifier, v_identifier);
                END IF;
                
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, used_at = NOW()
                WHERE id = v_special_pwd.id;

            -- 类型 4: multi_use（多次使用，限次数，不限制浏览器）
            ELSIF v_special_pwd.password_type = 'multi_use' THEN
                IF v_special_pwd.max_usages IS NOT NULL AND v_special_pwd.used_count >= v_special_pwd.max_usages THEN
                    RETURN jsonb_build_object('success', false, 'message', '该密码使用次数已达上限', 'errorCode', 'USAGE_LIMIT_REACHED');
                END IF;
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, 
                    is_used = CASE WHEN max_usages IS NOT NULL AND COALESCE(used_count, 0) + 1 >= max_usages THEN TRUE ELSE is_used END,
                    used_at = NOW()
                WHERE id = v_special_pwd.id;

            -- 类型 5: long_term（长期使用，有限期限内，不限制浏览器）
            ELSIF v_special_pwd.password_type = 'long_term' THEN
                UPDATE public.daily_gallery_special_passwords 
                SET used_count = COALESCE(used_count, 0) + 1, used_at = NOW()
                WHERE id = v_special_pwd.id;
            END IF;
            
            v_expires_at := COALESCE(v_special_pwd.expires_at, now() + interval '24 hours');
        
        -- 3.2 检查通用配置密码
        ELSIF v_config->>'universal_password' IS NOT NULL AND v_p_trimmed = v_config->>'universal_password' THEN
            v_expires_at := now() + interval '24 hours';

        -- 3.3 检查帖子自带的原始密码
        ELSIF v_correct_password = v_p_trimmed THEN
            v_expires_at := now() + interval '2 hours';

        -- 3.4 检查其他类型密码
        ELSE
            SELECT id INTO v_account_pwd_id
            FROM public.daily_gallery_account_passwords
            WHERE post_id = v_post_id
              AND password = v_p_trimmed
            LIMIT 1;

            IF v_account_pwd_id IS NOT NULL THEN
                v_expires_at := now() + interval '24 hours';
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

                    -- daily_gallery_user_passwords 浏览器指纹级别锁定
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
