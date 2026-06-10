-- 00000_fix_upsert_user_visit_stats.sql
-- 这个文件必须在所有其他修改 upsert_user_visit_stats 函数的文件之前执行

-- 彻底删除所有可能存在的 upsert_user_visit_stats 函数
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 先尝试删除特定签名的函数
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- 然后删除所有重载版本
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes 
              FROM pg_proc 
              INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
              WHERE proname = 'upsert_user_visit_stats' AND pg_namespace.nspname = 'public') 
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION public.' || quote_ident(r.proname) || '(' || r.argtypes || ')';
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- 创建一个基本版本的函数，使用原始参数名称
CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
    user_id uuid,
    ip_address text,
    browser text,
    os text,
    network_type text,
    path text,
    duration integer,
    adblock_enabled boolean,
    device text,
    country text,
    region text,
    city text,
    referrer text,
    resolution text,
    language text,
    page_title text,
    visited_at timestamp with time zone
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
    user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
    device,
    country, region, city, referrer, resolution, language, page_title, visited_at
  );
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone) TO anon, authenticated;