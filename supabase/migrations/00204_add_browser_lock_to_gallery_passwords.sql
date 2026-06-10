-- 为每日图集用户密码表添加浏览器锁定字段
ALTER TABLE daily_gallery_user_passwords ADD COLUMN IF NOT EXISTS locked_browser_id TEXT;

-- 更新 RPC 函数以支持浏览器锁定逻辑
CREATE OR REPLACE FUNCTION public.verify_daily_gallery_password(p_post_date date, p_password text, p_openid text DEFAULT NULL, p_browser_id text DEFAULT NULL)
 RETURNS TABLE(is_valid boolean, post_id uuid, image_ids uuid[], expires_at timestamp with time zone, error_code text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_post RECORD;
  v_user_pwd RECORD;
BEGIN
  -- 1. 检查是否存在该日期的发布记录
  SELECT * INTO v_post
  FROM daily_gallery_posts
  WHERE post_date = p_post_date
    AND is_published = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'POST_NOT_FOUND';
    RETURN;
  END IF;

  -- 2. 检查用户专属密码
  IF p_openid IS NOT NULL AND p_openid <> '' THEN
    SELECT * INTO v_user_pwd
    FROM daily_gallery_user_passwords
    WHERE openid = p_openid 
      AND post_date = p_post_date;
      
    IF FOUND AND v_user_pwd.password = p_password AND v_user_pwd.expires_at > NOW() THEN
      -- 浏览器锁定逻辑
      IF p_browser_id IS NOT NULL AND p_browser_id <> '' THEN
        -- 如果还没锁定，则锁定为当前浏览器
        IF v_user_pwd.locked_browser_id IS NULL THEN
          UPDATE daily_gallery_user_passwords 
          SET locked_browser_id = p_browser_id 
          WHERE id = v_user_pwd.id;
          RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
        -- 如果已锁定，且浏览器 ID 不匹配
        ELSIF v_user_pwd.locked_browser_id <> p_browser_id THEN
          RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'BROWSER_LOCKED';
        ELSE
          RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
        END IF;
      ELSE
        -- 没有提供浏览器 ID，暂不处理锁定 (或者也可以强制要求浏览器 ID)
        RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at, NULL::TEXT;
      END IF;
      RETURN;
    END IF;
  END IF;

  -- 3. 检查全局密码 (作为兜底)
  IF v_post.password = p_password AND v_post.password_expires_at > NOW() THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_post.password_expires_at, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ, 'INVALID_PASSWORD';
  END IF;
END;
$function$;
