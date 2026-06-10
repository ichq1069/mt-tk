-- 先删除旧版本的函数（因为参数名称不同可能被视为不同的重载，虽然在 PostgREST 中只能有一个匹配）
-- 但为了保险，我们先彻底删除所有名为 upsert_user_visit_stats 的函数
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes 
              FROM pg_proc 
              INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
              WHERE proname = 'upsert_user_visit_stats' AND pg_namespace.nspname = 'public') 
    LOOP
        EXECUTE 'DROP FUNCTION public.' || quote_ident(r.proname) || '(' || r.argtypes || ')';
    END LOOP;
END $$;

-- 创建带 p_ 前缀参数的新版本函数，以匹配前端 core_user_api.ts 中的调用
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
  );
END;
$$;

-- 授予权限
GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone) TO anon, authenticated, service_role;

-- 顺便清理一下冗余的 _new 函数
DROP FUNCTION IF EXISTS public.upsert_user_visit_stats_new(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone);
