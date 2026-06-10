-- 1. 添加 visit_date 列
ALTER TABLE public.user_visit_stats ADD COLUMN IF NOT EXISTS visit_date DATE;

-- 2. 填充数据
UPDATE public.user_visit_stats SET visit_date = (created_at AT TIME ZONE 'UTC')::date WHERE visit_date IS NULL;

-- 3. 清理重复数据（保留 ID 最大的，即最新的）
DELETE FROM public.user_visit_stats a
USING public.user_visit_stats b
WHERE a.id < b.id
  AND a.ip_address = b.ip_address
  AND COALESCE(a.user_id, '00000000-0000-0000-0000-000000000000') = COALESCE(b.user_id, '00000000-0000-0000-0000-000000000000')
  AND a.path = b.path
  AND a.visit_date = b.visit_date;

-- 4. 设置默认值
ALTER TABLE public.user_visit_stats ALTER COLUMN visit_date SET DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC')::date;

-- 5. 删除冲突的旧索引
DROP INDEX IF EXISTS public.user_visit_stats_unique_visit;
DROP INDEX IF EXISTS public.user_visit_stats_full_unique;

-- 6. 创建新唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS user_visit_stats_date_unique 
ON public.user_visit_stats (
  ip_address, 
  (COALESCE(user_id, '00000000-0000-0000-0000-000000000000')), 
  path, 
  visit_date
);

-- 7. 重新定义函数
CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
  p_user_id uuid DEFAULT NULL::uuid, 
  p_ip_address text DEFAULT NULL::text, 
  p_browser text DEFAULT NULL::text, 
  p_os text DEFAULT NULL::text, 
  p_network_type text DEFAULT NULL::text, 
  p_path text DEFAULT NULL::text, 
  p_duration integer DEFAULT 0, 
  p_adblock_enabled boolean DEFAULT false, 
  p_device text DEFAULT NULL::text, 
  p_country text DEFAULT NULL::text, 
  p_region text DEFAULT NULL::text, 
  p_city text DEFAULT NULL::text, 
  p_referrer text DEFAULT NULL::text, 
  p_resolution text DEFAULT NULL::text, 
  p_language text DEFAULT NULL::text, 
  p_page_title text DEFAULT NULL::text, 
  p_visited_at timestamp with time zone DEFAULT now()
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_visit_date DATE;
BEGIN
  -- 明确计算日期
  v_visit_date := (COALESCE(p_visited_at, now()) AT TIME ZONE 'UTC')::date;

  INSERT INTO public.user_visit_stats (
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device_type, country, region, city, referrer, resolution, language, page_title, created_at, visit_date
  )
  VALUES (
    p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
    p_device, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, COALESCE(p_visited_at, now()), v_visit_date
  )
  ON CONFLICT (ip_address, (COALESCE(user_id, '00000000-0000-0000-0000-000000000000')), path, visit_date)
  DO UPDATE SET
    duration = GREATEST(public.user_visit_stats.duration, EXCLUDED.duration),
    user_id = COALESCE(public.user_visit_stats.user_id, EXCLUDED.user_id),
    page_title = EXCLUDED.page_title,
    created_at = EXCLUDED.created_at;
END;
$function$;
