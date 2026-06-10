-- 优化 can_view_album 函数
-- 确保被批准的用户（在 album_user_permissions 中有记录）可以进入图集，不受图集整体等级限制
-- 但是他们仍然受到单张照片等级的约束（由后端存储过程或前端逻辑控制）

CREATE OR REPLACE FUNCTION public.can_view_album(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_group_id UUID;
    v_album_apply_switch BOOLEAN;
    v_album_manage_levels TEXT[];
    v_album_allowed_group_ids UUID[];
    v_album_min_level TEXT;
    v_album_permission_level TEXT; 
    v_effective_level TEXT;
    v_role_weight INT;
    v_min_weight INT;
BEGIN
    -- 1. 获取当前用户信息
    SELECT role::TEXT, group_id INTO v_user_role, v_user_group_id FROM public.profiles WHERE id = v_user_id;

    -- 管理员始终拥有权限
    IF v_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 2. 获取图集配置
    SELECT apply_switch, user_manage_levels, allowed_group_ids, level 
    INTO v_album_apply_switch, v_album_manage_levels, v_album_allowed_group_ids, v_album_min_level
    FROM public.photo_albums WHERE id = p_album_id;

    -- 3. 获取图集内专属权限
    SELECT level INTO v_album_permission_level 
    FROM public.album_user_permissions 
    WHERE album_id = p_album_id AND user_id = v_user_id;

    -- 如果有专属权限（即通过申请或管理员手动添加），则无视权限组白名单限制和图集等级限制
    IF v_album_permission_level IS NOT NULL THEN
        RETURN TRUE;
    END IF;

    -- 4. 权限组白名单校验（仅针对没有专属权限的用户）
    IF v_album_allowed_group_ids IS NOT NULL AND array_length(v_album_allowed_group_ids, 1) > 0 THEN
        IF v_user_group_id IS NULL OR NOT (v_user_group_id = ANY(v_album_allowed_group_ids)) THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- 5. 图集申请模式判断
    -- 如果开启了申请模式，但没有专属权限，则禁止进入
    IF v_album_apply_switch THEN
        RETURN FALSE;
    END IF;

    -- 6. 图集门槛校验（针对未开启申请模式且没有专属权限的用户）
    v_effective_level := COALESCE(v_user_role, 'pt');

    SELECT CASE v_effective_level
        WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
    END INTO v_role_weight;
        
    SELECT CASE COALESCE(v_album_min_level, 'pt')
        WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
    END INTO v_min_weight;
        
    RETURN v_role_weight >= v_min_weight;
END;
$$;
