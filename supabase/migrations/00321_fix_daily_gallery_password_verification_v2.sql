CREATE OR REPLACE FUNCTION verify_daily_gallery_password(
  p_post_date TEXT,
  p_password TEXT,
  p_openid TEXT DEFAULT NULL,
  p_browser_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  post_id UUID,
  image_ids UUID[],
  expires_at TIMESTAMPTZ,
  error_code TEXT
) AS $$
DECLARE
  v_post RECORD;
  v_user_pwd RECORD;
  v_special_pwd RECORD;
  v_universal_pwd TEXT;
  v_config JSONB;
  v_actual_post_date DATE;
BEGIN
  -- 尝试转换日期格式
  BEGIN
    v_actual_post_date := p_post_date::DATE;
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
  
  IF v_universal_pwd IS NOT NULL AND v_universal_pwd <> '' AND p_password = v_universal_pwd THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (NOW() + INTERVAL '24 hours'), NULL::TEXT;
    RETURN;
  END IF;

  -- 3. 检查随机/特权密码库
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
    
    IF v_special_pwd.is_one_time AND v_special_pwd.is_used THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'PASSWORD_USED'::TEXT;
      RETURN;
    END IF;

    IF v_special_pwd.is_one_time THEN
      UPDATE daily_gallery_special_passwords SET is_used = TRUE, used_at = NOW() WHERE id = v_special_pwd.id;
    END IF;
    
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (NOW() + INTERVAL '24 hours'), NULL::TEXT;
    RETURN;
  END IF;

  -- 4. 检查用户专属密码
  -- 优化：优先匹配密码和日期。如果有 p_openid，则在同密码记录中优先匹配它。
  -- 即使 p_openid 为空，只要密码匹配日期匹配，也认为有效（对应直接访问场景）。
  SELECT * INTO v_user_pwd
  FROM daily_gallery_user_passwords
  WHERE post_date = v_actual_post_date 
    AND password = p_password
  ORDER BY (CASE WHEN (p_openid IS NOT NULL AND p_openid <> '' AND openid = p_openid) THEN 1 ELSE 2 END)
  LIMIT 1;

  IF FOUND THEN
    IF v_user_pwd.expires_at <= NOW() THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], v_user_pwd.expires_at, 'PASSWORD_EXPIRED'::TEXT;
      RETURN;
    END IF;

    -- 浏览器锁定逻辑
    IF p_browser_id IS NOT NULL AND p_browser_id <> '' THEN
      IF v_user_pwd.locked_browser_id IS NULL OR v_user_pwd.locked_browser_id = '' THEN
        UPDATE daily_gallery_user_passwords 
        SET locked_browser_id = p_browser_id 
        WHERE id = v_user_pwd.id;
        RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
      ELSIF v_user_pwd.locked_browser_id NOT LIKE '%' || p_browser_id || '%' THEN
        IF POSITION(',' IN v_user_pwd.locked_browser_id) = 0 AND v_user_pwd.locked_browser_id <> p_browser_id THEN
           UPDATE daily_gallery_user_passwords 
           SET locked_browser_id = v_user_pwd.locked_browser_id || ',' || p_browser_id
           WHERE id = v_user_pwd.id;
           RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
        ELSE
           RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'BROWSER_LOCKED'::TEXT;
        END IF;
      ELSE
        RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
      END IF;
    ELSE
      -- 没有提供浏览器 ID，依然允许访问
      RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
    END IF;
    RETURN;
  END IF;

  -- 5. 最后检查每日密码
  IF v_post.password = p_password THEN
    IF v_post.password_expires_at <= NOW() THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], v_post.password_expires_at, 'PASSWORD_EXPIRED'::TEXT;
    ELSE
      RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_post.password_expires_at, NULL::TEXT;
    END IF;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'INVALID_PASSWORD'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
