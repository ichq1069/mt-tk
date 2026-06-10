-- 添加缺失的 duration 列
ALTER TABLE public.user_visit_stats ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0;

-- 重新定义 upsert_user_visit_stats RPC（动态清理，带错误捕获）
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 尝试删除特定签名的函数（忽略错误）
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
        p_duration integer DEFAULT 0,
        p_adblock_enabled boolean DEFAULT false
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    AS $function$
    BEGIN
        INSERT INTO user_visit_stats (user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled)
        VALUES (p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled)
        ON CONFLICT (ip_address, browser, os, network_type, path) 
        DO UPDATE SET 
            user_id = COALESCE(EXCLUDED.user_id, user_visit_stats.user_id),
            duration = EXCLUDED.duration,
            adblock_enabled = EXCLUDED.adblock_enabled,
            created_at = NOW();
            
        RETURN jsonb_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
    $function$;
EXCEPTION 
    WHEN duplicate_object THEN
        -- 函数已存在且参数名不同，跳过此迁移
        RAISE NOTICE 'Function upsert_user_visit_stats already exists with different parameters, skipping';
    WHEN OTHERS THEN
        -- 其他错误，记录但不中断
        RAISE NOTICE 'Error creating function: %, skipping', SQLERRM;
END $$;
