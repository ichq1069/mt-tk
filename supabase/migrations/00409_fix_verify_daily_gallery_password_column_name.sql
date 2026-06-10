CREATE OR REPLACE FUNCTION public.verify_daily_gallery_password(p_post_date text, p_password text DEFAULT NULL::text, p_openid text DEFAULT NULL::text, p_browser_id text DEFAULT NULL::text)
 RETURNS TABLE(is_valid boolean, post_id uuid, image_ids uuid[], expires_at timestamp with time zone, error_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_post RECORD;
  v_user_pwd RECORD;
  v_special_pwd RECORD;
  v_universal_pwd TEXT;
  v_config JSONB;
  v_actual_post_date DATE;
  v_is_today BOOLEAN;
BEGIN
  -- 尝试转换日期格式
  BEGIN
    v_actual_post_date := p_post_date::DATE;
    v_is_today := (v_actual_post_date = CURRENT_DATE);
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'INVALID_DATE'::TEXT;
    RETURN;
  END;

  -- 1. 检查是否存在该日期的发布记录
  SELECT * INTO v_post
  FROM daily_gallery_posts
  WHERE post_date = v_actual_post_date
    AND is_published = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'POST_NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  -- 2. 检查全局通用密码
  SELECT value INTO v_config FROM system_configs WHERE key = 'daily_gallery_config';
  v_universal_pwd := v_config->>'universal_password';
  
  IF p_password IS NOT NULL AND v_universal_pwd IS NOT NULL AND v_universal_pwd <> '' AND p_password = v_universal_pwd THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (NOW() + INTERVAL '24 hours'), NULL::TEXT;
    RETURN;
  END IF;

  -- 3. 检查随机/特权密码库
  IF p_password IS NOT NULL THEN
    SELECT * INTO v_special_pwd
    FROM daily_gallery_special_passwords
    WHERE password = p_password
      AND (target_date IS NULL OR target_date = v_actual_post_date)
    ORDER BY target_date DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      IF v_special_pwd.expires_at IS NOT NULL AND v_special_pwd.expires_at <= NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'PASSWORD_EXPIRED'::TEXT;
        RETURN;
      END IF;
      
      -- 检查使用次数
      IF (v_special_pwd.used_count >= v_special_pwd.max_usages) OR (v_special_pwd.is_one_time AND v_special_pwd.is_used) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'PASSWORD_USED_UP'::TEXT;
        RETURN;
      END IF;

      -- 更新使用记录
      UPDATE daily_gallery_special_passwords 
      SET used_count = used_count + 1, 
          is_used = TRUE, 
          used_at = NOW() 
      WHERE id = v_special_pwd.id;
      
      RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (NOW() + INTERVAL '24 hours'), NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  -- 4. 检查用户专属密码 (公众号获取的密码)
  IF p_password IS NOT NULL THEN
    SELECT * INTO v_user_pwd
    FROM daily_gallery_user_passwords
    WHERE post_date = v_actual_post_date 
      AND password = p_password
    ORDER BY (CASE WHEN (p_openid IS NOT NULL AND p_openid <> '' AND openid = p_openid) THEN 1 ELSE 2 END)
    LIMIT 1;

    IF FOUND THEN
      -- 如果密码已过期且是当天的图集，报过期错误
      -- 如果是历史图集，则放宽过期限制（只要密码匹配且没被重置）
      IF v_is_today AND v_user_pwd.expires_at <= NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], v_user_pwd.expires_at, 'PASSWORD_EXPIRED'::TEXT;
        RETURN;
      END IF;

      -- 浏览器锁定逻辑
      IF p_browser_id IS NOT NULL AND p_browser_id <> '' THEN
        IF v_user_pwd.locked_browser_id IS NULL OR v_user_pwd.locked_browser_id = '' THEN
          UPDATE daily_gallery_user_passwords 
          SET locked_browser_id = p_browser_id 
          WHERE id = v_user_pwd.id;
          RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_user_pwd.expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_user_pwd.expires_at END), NULL::TEXT;
        ELSIF v_user_pwd.locked_browser_id NOT LIKE '%' || p_browser_id || '%' THEN
          -- 允许多个浏览器标识
          IF POSITION(',' IN v_user_pwd.locked_browser_id) = 0 AND v_user_pwd.locked_browser_id <> p_browser_id THEN
             UPDATE daily_gallery_user_passwords 
             SET locked_browser_id = v_user_pwd.locked_browser_id || ',' || p_browser_id
             WHERE id = v_user_pwd.id;
             RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_user_pwd.expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_user_pwd.expires_at END), NULL::TEXT;
          ELSE
             RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'BROWSER_LOCKED'::TEXT;
          END IF;
        ELSE
          RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_user_pwd.expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_user_pwd.expires_at END), NULL::TEXT;
        END IF;
      ELSE
        -- 没有提供浏览器 ID，依然允许访问
        RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_user_pwd.expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_user_pwd.expires_at END), NULL::TEXT;
      END IF;
      RETURN;
    END IF;
  END IF;

  -- 5. 最后检查每日密码 (图集自带的默认密码)
  IF p_password IS NOT NULL AND v_post.password = p_password THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_post.password_expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_post.password_expires_at END), NULL::TEXT;
  ELSIF p_password IS NULL AND (v_config->>'enable_password')::boolean = FALSE THEN
    -- 如果密码为 NULL 且后台配置禁用了密码验证，则允许直接访问
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (NOW() + INTERVAL '24 hours'), NULL::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'INVALID_PASSWORD'::TEXT;
  END IF;
END;
$function$
