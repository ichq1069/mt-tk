-- 创建新访问统计函数 upsert_user_visit_stats_new
-- 该方案用于绕过数据库迁移工具对函数参数名修改的限制
-- 新函数与旧函数独立存在，互不影响，实现零停机升级

-- 创建新函数，使用 p_ 前缀参数名
CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats_new(
    p_user_id uuid,
    p_ip_address text,
    p_browser text,
    p_os text,
    p_network_type text,
    p_path text,
    p_duration integer,
    p_adblock_enabled boolean,
    p_device text,
    p_country text,
    p_region text,
    p_city text,
    p_referrer text,
    p_resolution text,
    p_language text,
    p_page_title text,
    p_visited_at timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type,
    country, region, city, referrer, resolution, language, page_title, created_at
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device,
    p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, p_visited_at
  )
  ON CONFLICT (ip_address, browser, os, network_type, path)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    duration = GREATEST(public.user_visit_stats.duration, EXCLUDED.duration),
    adblock_enabled = EXCLUDED.adblock_enabled,
    device_type = EXCLUDED.device_type,
    country = EXCLUDED.country,
    region = EXCLUDED.region,
    city = EXCLUDED.city,
    referrer = EXCLUDED.referrer,
    resolution = EXCLUDED.resolution,
    language = EXCLUDED.language,
    page_title = EXCLUDED.page_title,
    created_at = EXCLUDED.created_at;
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats_new TO anon, authenticated, service_role;

-- 刷新 PostgREST 缓存
NOTIFY pgrst, 'reload schema';