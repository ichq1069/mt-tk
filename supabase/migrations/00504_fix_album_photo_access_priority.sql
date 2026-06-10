-- 1. 创建照片访问判定辅助函数
CREATE OR REPLACE FUNCTION public.can_view_album_photo(p_album_id UUID, p_photo_level TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_level TEXT;
    v_user_group_id UUID;
    v_user_group_permissions JSONB;
    v_album_permission_level TEXT;
    v_user_weight INT;
    v_photo_weight INT;
BEGIN
    -- 如果未登录，仅允许查看普通级
    IF v_user_id IS NULL THEN
        RETURN p_photo_level = 'normal' OR p_photo_level = 'pt';
    END IF;

    -- 获取用户信息
    SELECT role::TEXT, album_level::TEXT, group_id 
    INTO v_user_role, v_user_level, v_user_group_id 
    FROM public.profiles WHERE id = v_user_id;

    -- 管理员始终拥有权限
    IF v_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 检查基本图集访问权限 (包含权限组白名单校验、专属授权绕过逻辑)
    IF NOT public.can_view_album(p_album_id) THEN
        RETURN FALSE;
    END IF;

    -- 普通级照片对所有拥有图集访问权的用户开放
    IF p_photo_level = 'normal' OR p_photo_level = 'pt' THEN
        RETURN TRUE;
    END IF;

    -- 获取图集内专属权限
    SELECT level INTO v_album_permission_level 
    FROM public.album_user_permissions 
    WHERE album_id = p_album_id AND user_id = v_user_id;

    -- 判定照片权重
    SELECT CASE p_photo_level
        WHEN 'normal' THEN 0 WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
    END INTO v_photo_weight;

    IF v_album_permission_level IS NOT NULL THEN
        -- A. 专属授权模式：完全根据专属等级判定，不看权限点
        -- 冲突处理：专属授权优先级最高
        SELECT CASE v_album_permission_level
            WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
        END INTO v_user_weight;
        
        RETURN v_user_weight >= v_photo_weight;
    ELSE
        -- B. 全局模式：按账户等级 + 权限组权限点判定
        SELECT CASE COALESCE(v_user_level, v_user_role, 'pt')
            WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
        END INTO v_user_weight;

        IF v_user_weight >= v_photo_weight THEN
            RETURN TRUE;
        END IF;

        -- 检查权限点（作为账户等级的补充）
        IF v_user_group_id IS NOT NULL THEN
            SELECT permissions INTO v_user_group_permissions FROM public.permission_groups WHERE id = v_user_group_id;
            
            IF v_user_group_permissions IS NOT NULL THEN
                CASE p_photo_level
                    WHEN 'vip' THEN 
                        RETURN v_user_group_permissions @> '["album_level_vip"]'::jsonb 
                            OR v_user_group_permissions @> '["album_level_svip"]'::jsonb 
                            OR v_user_group_permissions @> '["album_level_vvip"]'::jsonb;
                    WHEN 'svip' THEN 
                        RETURN v_user_group_permissions @> '["album_level_svip"]'::jsonb 
                            OR v_user_group_permissions @> '["album_level_vvip"]'::jsonb;
                    WHEN 'vvip', 'restricted' THEN 
                        RETURN v_user_group_permissions @> '["album_level_vvip"]'::jsonb;
                    ELSE 
                        RETURN FALSE;
                END CASE;
            END IF;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. 更新 RLS 策略
DROP POLICY IF EXISTS "user_select_album_photos" ON public.album_photos;
CREATE POLICY "user_select_album_photos" ON public.album_photos
FOR SELECT TO anon, authenticated
USING (can_view_album_photo(album_id, level));
