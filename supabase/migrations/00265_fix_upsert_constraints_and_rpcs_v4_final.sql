-- 1. 优化 favorites, user_pending_items, dislikes 的唯一约束，使用 NULLS NOT DISTINCT (PG 15+) 处理 NULL user_id
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_media_id_key;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_media_id_key UNIQUE NULLS NOT DISTINCT (user_id, media_id);

ALTER TABLE user_pending_items DROP CONSTRAINT IF EXISTS user_pending_items_user_id_media_id_key;
ALTER TABLE user_pending_items ADD CONSTRAINT user_pending_items_user_id_media_id_key UNIQUE NULLS NOT DISTINCT (user_id, media_id);

-- 确保 dislikes 也有唯一约束
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'dislikes'::regclass AND contype = 'u') THEN
        ALTER TABLE dislikes ADD CONSTRAINT dislikes_user_id_media_id_key UNIQUE NULLS NOT DISTINCT (user_id, media_id);
    END IF;
END $$;

-- 2. 创建 RPC 函数以彻底绕过 PostgREST columns 引号导致的 42703 错误，并支持 NULL user_id 的 upsert

-- 2.1 收藏 (Upsert 批量模式)
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

-- 2.2 收藏 (切换/Toggle 模式)
CREATE OR REPLACE FUNCTION toggle_favorite(p_user_id UUID, p_media_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    -- 这里要使用 NULLS NOT DISTINCT 的语义来匹配现有的 NULL user_id 记录
    SELECT id INTO v_existing_id 
    FROM favorites 
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) 
      AND (media_id IS NOT DISTINCT FROM p_media_id)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        DELETE FROM favorites WHERE id = v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
        INSERT INTO favorites (user_id, media_id)
        VALUES (p_user_id, p_media_id)
        RETURNING id INTO v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'added', 'id', v_existing_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 不喜欢 (切换/Toggle 模式)
CREATE OR REPLACE FUNCTION toggle_dislike(p_user_id UUID, p_media_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    SELECT id INTO v_existing_id 
    FROM dislikes 
    WHERE (user_id IS NOT DISTINCT FROM p_user_id) 
      AND (media_id IS NOT DISTINCT FROM p_media_id)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        DELETE FROM dislikes WHERE id = v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
        INSERT INTO dislikes (user_id, media_id)
        VALUES (p_user_id, p_media_id)
        RETURNING id INTO v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'added', 'id', v_existing_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.4 访问统计 (Upsert)（动态清理）
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
        created_at = NOW();
        
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.5 待处理项目 (Upsert)
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

-- 3. 升级用户权限视图与管理：将个人自定义权限融入系统展示
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
    p.id AS user_id, 
    COALESCE(g.name, '自定义') AS group_name, 
    COALESCE(p.permissions, g.permissions, '[]'::jsonb) AS permissions
FROM profiles p
LEFT JOIN permission_groups g ON p.group_id = g.id;

-- 用户权限更新 RPC
CREATE OR REPLACE FUNCTION update_user_permissions(p_user_id UUID, p_permissions JSONB)
RETURNS JSONB AS $$
BEGIN
    UPDATE profiles 
    SET permissions = p_permissions 
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
