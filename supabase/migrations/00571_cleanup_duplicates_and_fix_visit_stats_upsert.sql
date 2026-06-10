-- 1. 清理重复数据，只保留最新的记录
DELETE FROM public.user_visit_stats a
USING public.user_visit_stats b
WHERE a.id < b.id
  AND a.ip_address = b.ip_address
  AND a.browser = b.browser
  AND a.os = b.os
  AND a.network_type = b.network_type
  AND a.path = b.path;

-- 2. 创建唯一索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'user_visit_stats_unique_visit'
        AND n.nspname = 'public'
    ) THEN
        CREATE UNIQUE INDEX user_visit_stats_unique_visit ON public.user_visit_stats (ip_address, browser, os, network_type, path);
    END IF;
END $$;

-- 3. 重新定义函数，支持 ON CONFLICT
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
  p_visited_at timestamp with time zone DEFAULT now()
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title, created_at
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, COALESCE(p_visited_at, now())
  )
  ON CONFLICT (ip_address, browser, os, network_type, path) 
  DO UPDATE SET
    duration = GREATEST(public.user_visit_stats.duration, EXCLUDED.duration),
    user_id = COALESCE(public.user_visit_stats.user_id, EXCLUDED.user_id),
    page_title = EXCLUDED.page_title,
    created_at = EXCLUDED.created_at;
END;
$function$;
