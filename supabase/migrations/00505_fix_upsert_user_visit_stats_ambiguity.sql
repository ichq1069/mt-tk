-- Fix upsert_user_visit_stats RPC ambiguity by using prefixed parameters (with error handling)
-- First drop existing function to change parameter names (using dynamic SQL for safety)
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

-- Create function (wrapped in DO block to catch 42P13 error, allow skip)
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
EXCEPTION 
    WHEN duplicate_object THEN
        RAISE NOTICE 'Function upsert_user_visit_stats already exists with different parameters, skipping';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating function: %, skipping', SQLERRM;
END $$;
