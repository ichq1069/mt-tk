-- 重新定义验证函数，避免与内部变量/返回表列名冲突
DROP FUNCTION IF EXISTS verify_daily_gallery_password(date, text, text, text);

CREATE OR REPLACE FUNCTION verify_daily_gallery_password(
  p_post_date DATE,
  p_password TEXT,
  p_openid TEXT DEFAULT NULL,
  p_browser_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  r_is_valid BOOLEAN,
  r_post_id UUID,
  r_image_ids UUID[],
  r_expires_at TIMESTAMPTZ,
  r_error_code TEXT
) AS $$
DECLARE
  v_post RECORD;
  v_user_pwd RECORD;
  v_special_pwd RECORD;
  v_universal_pwd TEXT;
  v_config JSONB;
BEGIN
  -- 1. 检查是否存在该日期的发布记录
  SELECT * INTO v_post
  FROM daily_gallery_posts
  WHERE post_date = p_post_date
    AND is_published = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'POST_NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  -- 2. 检查全局通用密码 (从系统配置中获取)
  SELECT value INTO v_config FROM system_configs WHERE key = 'daily_gallery_config';
  v_universal_pwd := v_config->>'universal_password';
  
  IF v_universal_pwd IS NOT NULL AND v_universal_pwd <> '' AND p_password = v_universal_pwd THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (NOW() + INTERVAL '24 hours'), NULL::TEXT;
    RETURN;
  END IF;

  -- 3. 检查随机/特权密码库 (Special Passwords)
  -- 我们优先检查绑定了日期的随机密码，如果没有，再检查通用的。
  SELECT * INTO v_special_pwd
  FROM daily_gallery_special_passwords
  WHERE password = p_password
    AND (target_date IS NULL OR target_date = p_post_date)
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (is_one_time = FALSE OR is_used = FALSE)
  ORDER BY target_date DESC NULLS LAST -- 优先匹配特定日期
  LIMIT 1;

  IF FOUND THEN
    -- 如果是一次性密码，标记为已使用
    IF v_special_pwd.is_one_time THEN
      UPDATE daily_gallery_special_passwords 
      SET is_used = TRUE, used_at = NOW() 
      WHERE id = v_special_pwd.id;
    END IF;
    
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (NOW() + INTERVAL '24 hours'), NULL::TEXT;
    RETURN;
  END IF;

  -- 4. 检查用户专属密码 (原有逻辑)
  IF p_openid IS NOT NULL AND p_openid <> '' THEN
    SELECT * INTO v_user_pwd
    FROM daily_gallery_user_passwords
    WHERE openid = p_openid 
      AND post_date = p_post_date;
      
    IF FOUND AND v_user_pwd.password = p_password AND v_user_pwd.expires_at > NOW() THEN
      -- 浏览器锁定逻辑
      IF p_browser_id IS NOT NULL AND p_browser_id <> '' THEN
        IF v_user_pwd.locked_browser_id IS NULL THEN
          UPDATE daily_gallery_user_passwords 
          SET locked_browser_id = p_browser_id 
          WHERE id = v_user_pwd.id;
          RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
        ELSIF v_user_pwd.locked_browser_id <> p_browser_id THEN
          RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'BROWSER_LOCKED'::TEXT;
        ELSE
          RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
        END IF;
      ELSE
        RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
      END IF;
      RETURN;
    END IF;
  END IF;

  -- 5. 检查普通每日密码 (原有逻辑)
  IF v_post.password = p_password AND v_post.password_expires_at > NOW() THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_post.password_expires_at, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'INVALID_PASSWORD'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;
