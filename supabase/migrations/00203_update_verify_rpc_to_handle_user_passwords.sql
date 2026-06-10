CREATE OR REPLACE FUNCTION public.verify_daily_gallery_password(p_post_date date, p_password text, p_openid text DEFAULT NULL)
 RETURNS TABLE(is_valid boolean, post_id uuid, image_ids uuid[], expires_at timestamp with time zone)
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
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- 2. 检查用户专属密码
  IF p_openid IS NOT NULL AND p_openid <> '' THEN
    SELECT * INTO v_user_pwd
    FROM daily_gallery_user_passwords
    WHERE openid = p_openid 
      AND post_date = p_post_date;
      
    IF FOUND AND v_user_pwd.password = p_password AND v_user_pwd.expires_at > NOW() THEN
      RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_user_pwd.expires_at;
      RETURN;
    END IF;
  END IF;

  -- 3. 检查全局密码 (作为兜底)
  IF v_post.password = p_password AND v_post.password_expires_at > NOW() THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_post.password_expires_at;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ;
  END IF;
END;
$function$;
