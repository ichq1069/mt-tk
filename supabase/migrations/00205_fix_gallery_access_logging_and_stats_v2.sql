-- 1. 为 daily_gallery_access_logs 添加浏览器指纹字段（如果不存在）
ALTER TABLE daily_gallery_access_logs ADD COLUMN IF NOT EXISTS browser_fingerprint TEXT;

-- 2. 优化 log_daily_gallery_access RPC 函数
CREATE OR REPLACE FUNCTION public.log_daily_gallery_access(
  p_post_id uuid, 
  p_user_openid text DEFAULT NULL::text, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_ip_address text DEFAULT NULL::text, 
  p_user_agent text DEFAULT NULL::text, 
  p_password_used text DEFAULT NULL::text,
  p_browser_fingerprint text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  -- 插入访问日志
  INSERT INTO daily_gallery_access_logs (
    post_id, user_openid, user_id, ip_address, user_agent, password_used, browser_fingerprint
  ) VALUES (
    p_post_id, p_user_openid, p_user_id, p_ip_address, p_user_agent, p_password_used, p_browser_fingerprint
  ) RETURNING id INTO v_log_id;

  -- 精确更新浏览次数
  UPDATE daily_gallery_posts
  SET view_count = (
    SELECT count(*) 
    FROM daily_gallery_access_logs 
    WHERE post_id = p_post_id
  )
  WHERE id = p_post_id;

  -- 精确更新独立访客数 (基于指纹、OpenID 或 UserID 的组合)
  UPDATE daily_gallery_posts
  SET unique_visitor_count = (
    SELECT count(distinct coalesce(browser_fingerprint, user_openid, user_id::text, ip_address)) 
    FROM daily_gallery_access_logs 
    WHERE post_id = p_post_id
  )
  WHERE id = p_post_id;

  RETURN v_log_id;
END;
$function$;

-- 3. 修复 get_daily_gallery_stats RPC 函数
-- 先删除原有的函数，因为返回类型可能由于 cardinality 等改变
DROP FUNCTION IF EXISTS public.get_daily_gallery_stats(date, date);

CREATE OR REPLACE FUNCTION public.get_daily_gallery_stats(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(post_id uuid, post_date date, image_count integer, view_count integer, unique_visitor_count integer, password text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.post_date,
    cardinality(p.image_ids)::integer as image_count,
    COALESCE(p.view_count, 0)::integer as view_count,
    COALESCE(p.unique_visitor_count, 0)::integer as unique_visitor_count,
    p.password
  FROM daily_gallery_posts p
  WHERE (p_start_date IS NULL OR p.post_date >= p_start_date)
    AND (p_end_date IS NULL OR p.post_date <= p_end_date)
  ORDER BY p.post_date DESC;
END;
$function$;
