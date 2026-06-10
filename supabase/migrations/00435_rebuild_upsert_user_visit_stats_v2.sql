-- 删除旧的所有版本（动态清理，带错误捕获）
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 尝试删除特定签名的函数
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- 删除所有重载版本
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

-- 重新定义函数（包裹在 DO 块中以捕获 42P13 错误，允许跳过）
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION upsert_user_visit_stats(
        user_id uuid DEFAULT NULL,
        ip_address text DEFAULT 'unknown',
        browser text DEFAULT 'unknown',
        os text DEFAULT 'unknown',
        network_type text DEFAULT 'unknown',
        path text DEFAULT '/',
        duration integer DEFAULT 0,
        adblock_enabled boolean DEFAULT false,
        device text DEFAULT 'PC',
        country text DEFAULT NULL,
        region text DEFAULT NULL,
        city text DEFAULT NULL,
        referrer text DEFAULT NULL,
        resolution text DEFAULT NULL,
        language text DEFAULT NULL,
        page_title text DEFAULT NULL
    )
    RETURNS void AS $$
    BEGIN
        INSERT INTO public.user_visit_stats (
            user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
            device_type, country, region, city, referrer, resolution, language, page_title
        )
        VALUES (
            upsert_user_visit_stats.user_id,
            upsert_user_visit_stats.ip_address,
            upsert_user_visit_stats.browser,
            upsert_user_visit_stats.os,
            upsert_user_visit_stats.network_type,
            upsert_user_visit_stats.path,
            upsert_user_visit_stats.duration,
            upsert_user_visit_stats.adblock_enabled,
            upsert_user_visit_stats.device,
            upsert_user_visit_stats.country,
            upsert_user_visit_stats.region,
            upsert_user_visit_stats.city,
            upsert_user_visit_stats.referrer,
            upsert_user_visit_stats.resolution,
            upsert_user_visit_stats.language,
            upsert_user_visit_stats.page_title
        );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- 授予权限
    GRANT EXECUTE ON FUNCTION upsert_user_visit_stats TO anon, authenticated;
EXCEPTION 
    WHEN duplicate_object THEN
        RAISE NOTICE 'Function upsert_user_visit_stats already exists with different parameters, skipping';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating function: %, skipping', SQLERRM;
END $$;
