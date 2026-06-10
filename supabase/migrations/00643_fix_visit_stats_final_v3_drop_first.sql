-- 1. 清理重复数据
DELETE FROM public.user_visit_stats a
USING public.user_visit_stats b
WHERE a.id < b.id
  AND a.ip_address = b.ip_address
  AND a.path = b.path
  AND a.visit_date = b.visit_date;

-- 2. 删除索引
DROP INDEX IF EXISTS public.user_visit_stats_date_unique;
DROP INDEX IF EXISTS public.idx_user_visit_stats_unique;
DROP INDEX IF EXISTS public.idx_user_visit_stats_daily_unique;

-- 3. 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_visit_stats_daily_unique 
ON public.user_visit_stats (ip_address, path, visit_date);

-- 4. 彻底删除并重建函数
DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
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
DECLARE
  v_visit_date DATE;
BEGIN
  v_visit_date := (COALESCE(p_visited_at, now()) AT TIME ZONE 'UTC')::date;

  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title, created_at, visit_date
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, 
    COALESCE(p_visited_at, now()), v_visit_date
  )
  ON CONFLICT (ip_address, path, visit_date)
  DO UPDATE SET
    duration = GREATEST(public.user_visit_stats.duration, EXCLUDED.duration),
    user_id = COALESCE(EXCLUDED.user_id, public.user_visit_stats.user_id),
    browser = EXCLUDED.browser,
    os = EXCLUDED.os,
    network_type = EXCLUDED.network_type,
    device_type = EXCLUDED.device_type,
    country = EXCLUDED.country,
    region = EXCLUDED.region,
    city = EXCLUDED.city,
    referrer = EXCLUDED.referrer,
    resolution = EXCLUDED.resolution,
    language = EXCLUDED.language,
    page_title = EXCLUDED.page_title,
    adblock_enabled = EXCLUDED.adblock_enabled,
    created_at = EXCLUDED.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats TO anon, authenticated, service_role;