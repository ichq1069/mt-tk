-- 1. 优化 favorites 和 user_pending_items 的唯一约束以处理 NULL user_id (Postgres 15+ 特性)
-- 这一步将使 NULL 值被视为相同，从而在 user_id 为 NULL 时也能触发冲突，避免重复插入数据。
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_media_id_key;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_media_id_key UNIQUE NULLS NOT DISTINCT (user_id, media_id);

ALTER TABLE user_pending_items DROP CONSTRAINT IF EXISTS user_pending_items_user_id_media_id_key;
ALTER TABLE user_pending_items ADD CONSTRAINT user_pending_items_user_id_media_id_key UNIQUE NULLS NOT DISTINCT (user_id, media_id);

-- 2. 创建 RPC 函数来替代前端直接调用 .upsert()，以彻底规避 PostgREST columns 参数引号引起的 42703 错误

-- 2.1 收藏 RPC
CREATE OR REPLACE FUNCTION upsert_favorite(p_user_id UUID, p_media_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO favorites (user_id, media_id)
    VALUES (p_user_id, p_media_id)
    ON CONFLICT (user_id, media_id) DO NOTHING
    RETURNING id INTO v_id;
    
    RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 访问统计 RPC（动态清理）
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

CREATE OR REPLACE FUNCTION upsert_user_visit_stats(
    p_user_id UUID,
    p_ip_address TEXT,
    p_browser TEXT,
    p_os TEXT,
    p_network_type TEXT,
    p_path TEXT,
    p_duration INTEGER
)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO user_visit_stats (user_id, ip_address, browser, os, network_type, path, duration)
    VALUES (p_user_id, p_ip_address, p_browser, p_os, p_network_type, p_path, p_duration)
    ON CONFLICT (ip_address, browser, os, network_type, path) 
    DO UPDATE SET 
        user_id = COALESCE(EXCLUDED.user_id, user_visit_stats.user_id),
        duration = EXCLUDED.duration,
        created_at = NOW(); -- 记录最后访问时间
        
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 待处理项目 RPC
CREATE OR REPLACE FUNCTION upsert_user_pending_item(p_user_id UUID, p_media_id UUID)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO user_pending_items (user_id, media_id)
    VALUES (p_user_id, p_media_id)
    ON CONFLICT (user_id, media_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
