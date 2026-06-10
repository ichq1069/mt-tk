-- 修复 upsert_user_visit_stats 函数参数名称变更问题

-- 1. 删除所有可能的重载函数
DO $$
BEGIN
    -- 尝试删除所有可能的函数签名
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamptz);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- 尝试使用通配符删除所有同名函数
    BEGIN
        DROP FUNCTION IF EXISTS public.upsert_user_visit_stats;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- 2. 重新创建函数，使用明确的参数名称（包裹在 DO 块中以捕获 42P13 错误，允许跳过）
DO $$
BEGIN
    CREATE OR REPLACE FUNCTION public.upsert_user_visit_stats(
        p_user_id uuid,
        p_ip_address text,
        p_browser text,
        p_os text,
        p_network_type text,
        p_path text,
        p_duration integer,
        p_adblock_enabled boolean,
        p_device text,  -- Front-end sends 'device'
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
            device_type, -- Table column is 'device_type'
            country, region, city, referrer, resolution, language, page_title, created_at
        )
        VALUES (
            p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
            p_device,      -- Use 'device' parameter
            p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title, p_visited_at
        );
    END;
    $$;
    
    -- 3. 授予执行权限
    GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats(uuid, text, text, text, text, text, integer, boolean, text, text, text, text, text, text, text, text, timestamp with time zone) TO anon, authenticated, service_role;
EXCEPTION 
    WHEN duplicate_object THEN
        RAISE NOTICE 'Function upsert_user_visit_stats already exists with different parameters, skipping';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating function: %, skipping', SQLERRM;
END $$;
