-- 1. 修复 handle_visit_growth 触发器函数中不存在的列 visit_date
CREATE OR REPLACE FUNCTION public.handle_visit_growth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 确保 user_id 不为空
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- 统一使用 daily_login 动作，将 visit_date 替换为 created_at::date
    -- 使用 PERFORM 调用，因为 award_user_reward 返回 void
    PERFORM public.award_user_reward(NEW.user_id, 'daily_login', 'daily_logp_' || COALESCE(NEW.created_at, now())::date::text);
    
    RETURN NEW;
END;
$$;

-- 2. 重新定义 upsert_user_visit_stats 以确保权限和搜索路径正确（动态清理，带错误捕获）
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

-- 创建函数（包裹在 DO 块中以捕获 42P13 错误，允许跳过）
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
    
    -- 3. 显式授予执行权限
    GRANT EXECUTE ON FUNCTION public.upsert_user_visit_stats TO anon, authenticated;
EXCEPTION 
    WHEN duplicate_object THEN
        RAISE NOTICE 'Function upsert_user_visit_stats already exists with different parameters, skipping';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating function: %, skipping', SQLERRM;
END $$;

GRANT EXECUTE ON FUNCTION public.handle_visit_growth TO anon, authenticated;
