-- 彻底删除可能存在的冲突版本（动态清理）
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
DECLARE
    v_ip text;
    v_headers jsonb;
BEGIN
    -- 尝试从参数获取 IP，如果为空或为 'unknown'，则尝试从请求头获取（适配自建环境）
    v_ip := p_ip_address;
    
    IF v_ip IS NULL OR v_ip = 'unknown' OR v_ip = '' THEN
        BEGIN
            v_headers := current_setting('request.headers', true)::jsonb;
            v_ip := COALESCE(
                v_headers->>'cf-connecting-ip',
                v_headers->>'x-real-ip',
                split_part(v_headers->>'x-forwarded-for', ',', 1),
                v_ip
            );
        EXCEPTION WHEN OTHERS THEN
            -- 忽略获取 header 时的错误
        END;
    END IF;

    INSERT INTO user_visit_stats (user_id, ip_address, browser, os, network_type, path, duration, adblock_enabled)
    VALUES (p_user_id, v_ip, p_browser, p_os, p_network_type, p_path, p_duration, p_adblock_enabled)
    ON CONFLICT (ip_address, browser, os, network_type, path) 
    DO UPDATE SET 
        user_id = COALESCE(EXCLUDED.user_id, user_visit_stats.user_id),
        duration = EXCLUDED.duration,
        adblock_enabled = EXCLUDED.adblock_enabled,
        created_at = NOW();
        
    RETURN jsonb_build_object('success', true, 'ip', v_ip);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
