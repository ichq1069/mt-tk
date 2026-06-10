-- 优化 can_view_album 函数，解决图集权限审批通过后仍无法访问的问题
-- 并确保图集内专属权限（album_user_permissions）具有最高优先级

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

    -- 如果有专属权限，则无视权限组白名单限制
    IF v_album_permission_level IS NULL THEN
        -- 没有专属权限时，才执行权限组白名单校验
        IF v_album_allowed_group_ids IS NOT NULL AND array_length(v_album_allowed_group_ids, 1) > 0 THEN
            IF v_user_group_id IS NULL OR NOT (v_user_group_id = ANY(v_album_allowed_group_ids)) THEN
                RETURN FALSE;
            END IF;
        END IF;
    END IF;

    -- 4. 有效等级判定
    IF v_album_apply_switch THEN
        -- 开启了申请模式：必须有专属权限
        IF v_album_permission_level IS NULL THEN
            RETURN FALSE;
        END IF;
        -- 如果开启了申请模式且已有专属权限，准许进入图集
        -- (具体的照片访问权限由 photo_access 逻辑判定)
        RETURN TRUE;
    ELSE
        -- 未开启申请模式：优先使用专属等级，否则使用全局等级
        v_effective_level := COALESCE(v_album_permission_level, v_user_role, 'pt');
    END IF;

    -- 5. 图集门槛校验
    SELECT CASE v_effective_level
        WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
    END INTO v_role_weight;
        
    SELECT CASE COALESCE(v_album_min_level, 'pt')
        WHEN 'pt' THEN 0 WHEN 'vip' THEN 1 WHEN 'svip' THEN 2 WHEN 'vvip' THEN 3 WHEN 'restricted' THEN 3 ELSE 0
    END INTO v_min_weight;
        
    RETURN v_role_weight >= v_min_weight;
END;
$$;
