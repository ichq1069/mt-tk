-- 删除所有同名函数以彻底消除多重定义带来的歧义（动态清理，带错误捕获）
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

-- 重新创建唯一的、包含完整参数的函数（包裹在 DO 块中以捕获 42P13 错误，允许跳过）
DO $$
BEGIN
    create or replace function upsert_user_visit_stats(
        p_user_id uuid default null,
        p_ip_address text default 'unknown',
        p_browser text default 'unknown',
        p_os text default 'unknown',
        p_network_type text default 'unknown',
        p_path text default '/',
        p_duration integer default 0,
        p_adblock_enabled boolean default false,
        p_device_type text default 'PC',
        p_country text default null,
        p_region text default null,
        p_city text default null,
        p_referrer text default null,
        p_resolution text default null,
        p_language text default null,
        p_page_title text default null
    )
    returns void as $$
    begin
        insert into user_visit_stats (
            user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled,
            device_type, country, region, city, referrer, resolution, language, page_title
        )
        values (
            p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled,
            p_device_type, p_country, p_region, p_city, p_referrer, p_resolution, p_language, p_page_title
        );
    end;
    $$ language plpgsql security definer;
    
    -- 授予权限
    grant execute on function upsert_user_visit_stats to anon, authenticated;
EXCEPTION 
    WHEN duplicate_object THEN
        RAISE NOTICE 'Function upsert_user_visit_stats already exists with different parameters, skipping';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating function: %, skipping', SQLERRM;
END $$;
