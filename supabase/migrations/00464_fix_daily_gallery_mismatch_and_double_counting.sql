-- 1. 为 media_items 增加 daily_gallery_date 列
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS daily_gallery_date DATE;

-- 2. 更新 mark_images_as_used 函数，增加记录日期逻辑
CREATE OR REPLACE FUNCTION public.mark_images_as_used(image_ids uuid[], post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post_date DATE;
BEGIN
  -- 获取帖子日期
  SELECT post_date INTO v_post_date FROM public.daily_gallery_posts WHERE id = post_id;

  UPDATE public.media_items
  SET daily_gallery_status = 'used',
      daily_gallery_date = v_post_date
  WHERE id = ANY(image_ids);
END;
$function$;

-- 3. 改进 verify_daily_gallery_password 函数，增加对 special_passwords 的浏览器锁定支持
-- 并确保它作为单一可信源处理使用次数
CREATE OR REPLACE FUNCTION public.verify_daily_gallery_password(p_post_date text, p_password text DEFAULT NULL::text, p_openid text DEFAULT NULL::text, p_browser_id text DEFAULT NULL::text)
 RETURNS TABLE(is_valid boolean, post_id uuid, image_ids uuid[], expires_at timestamp with time zone, error_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_post RECORD;
  v_user_pwd RECORD;
  v_special_pwd RECORD;
  v_universal_pwd TEXT;
  v_config JSONB;
  v_actual_post_date DATE;
  v_is_today BOOLEAN;
  v_identifier TEXT;
BEGIN
  v_identifier := COALESCE(p_openid, p_browser_id);

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
      -- 校验有效期
      IF v_special_pwd.expires_at IS NOT NULL AND v_special_pwd.expires_at <= NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'PASSWORD_EXPIRED'::TEXT;
        RETURN;
      END IF;
      
      -- 校验使用次数
      IF (v_special_pwd.password_type IN ('one_time', 'multi_use')) AND 
         (v_special_pwd.is_used OR (v_special_pwd.max_usages IS NOT NULL AND v_special_pwd.used_count >= v_special_pwd.max_usages)) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'PASSWORD_USED_UP'::TEXT;
        RETURN;
      END IF;

      -- 校验浏览器锁定 (针对定期密码)
      IF v_special_pwd.password_type = 'periodic' AND v_special_pwd.browser_id IS NOT NULL AND v_special_pwd.browser_id <> '' THEN
        IF v_special_pwd.browser_id <> v_identifier THEN
          RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'BROWSER_LOCKED'::TEXT;
          RETURN;
        END IF;
      END IF;

      -- 更新使用记录
      UPDATE daily_gallery_special_passwords 
      SET used_count = COALESCE(used_count, 0) + 1, 
          is_used = CASE WHEN (password_type = 'one_time') OR (password_type = 'multi_use' AND COALESCE(used_count, 0) + 1 >= max_usages) THEN TRUE ELSE is_used END, 
          used_at = NOW(),
          browser_id = CASE WHEN (password_type = 'periodic' AND (browser_id IS NULL OR browser_id = '')) THEN v_identifier ELSE browser_id END
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
      IF v_is_today AND v_user_pwd.expires_at <= NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], v_user_pwd.expires_at, 'PASSWORD_EXPIRED'::TEXT;
        RETURN;
      END IF;

      IF p_browser_id IS NOT NULL AND p_browser_id <> '' THEN
        IF v_user_pwd.locked_browser_id IS NULL OR v_user_pwd.locked_browser_id = '' THEN
          UPDATE daily_gallery_user_passwords SET locked_browser_id = p_browser_id WHERE id = v_user_pwd.id;
          RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_user_pwd.expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_user_pwd.expires_at END), NULL::TEXT;
        ELSIF v_user_pwd.locked_browser_id NOT LIKE '%' || p_browser_id || '%' THEN
          IF POSITION(',' IN v_user_pwd.locked_browser_id) = 0 AND v_user_pwd.locked_browser_id <> p_browser_id THEN
             UPDATE daily_gallery_user_passwords SET locked_browser_id = v_user_pwd.locked_browser_id || ',' || p_browser_id WHERE id = v_user_pwd.id;
             RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_user_pwd.expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_user_pwd.expires_at END), NULL::TEXT;
          ELSE
             RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'BROWSER_LOCKED'::TEXT;
          END IF;
        ELSE
          RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_user_pwd.expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_user_pwd.expires_at END), NULL::TEXT;
        END IF;
      ELSE
        RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_user_pwd.expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_user_pwd.expires_at END), NULL::TEXT;
      END IF;
      RETURN;
    END IF;
  END IF;

  -- 5. 最后检查每日密码
  IF p_password IS NOT NULL AND v_post.password = p_password THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (CASE WHEN v_post.password_expires_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE v_post.password_expires_at END), NULL::TEXT;
  ELSIF p_password IS NULL AND (v_config->>'enable_password')::boolean = FALSE THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, (NOW() + INTERVAL '24 hours'), NULL::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'INVALID_PASSWORD'::TEXT;
  END IF;
END;
$function$;

-- 4. 更新 get_used_daily_gallery_images RPC 以返回每日图集日期和层级（如果有）
CREATE OR REPLACE FUNCTION public.get_used_daily_gallery_images(p_limit integer, p_offset integer, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, url text, title text, description text, used_at timestamp with time zone, post_date date, has_record boolean, daily_gallery_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, 
    m.url, 
    m.title, 
    m.description, 
    COALESCE(p.created_at, m.created_at) as used_at, 
    COALESCE(m.daily_gallery_date, p.post_date) as post_date,
    (p.id IS NOT NULL) as has_record,
    m.daily_gallery_status::text
  FROM public.media_items m
  LEFT JOIN public.daily_gallery_posts p ON m.id = ANY(p.image_ids)
  WHERE m.daily_gallery_status = 'used'
    AND m.type = 'image'
    AND m.deleted_at IS NULL
    AND (p_search IS NULL OR (m.title ILIKE '%' || p_search || '%' OR m.description ILIKE '%' || p_search || '%'))
  -- 排序：按发布日期倒序，确保最新发布的在前
  ORDER BY COALESCE(m.daily_gallery_date, p.post_date) DESC NULLS LAST, p.created_at DESC NULLS LAST, m.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
