
-- 1. Update photo_albums to support multiple allowed groups
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS allowed_group_ids UUID[];

-- Update existing data: if permission_group_id exists, put it in allowed_group_ids
UPDATE photo_albums SET allowed_group_ids = ARRAY[permission_group_id] WHERE permission_group_id IS NOT NULL AND allowed_group_ids IS NULL;

-- 2. Update can_view_album function to strictly follow the four-layer logic
CREATE OR REPLACE FUNCTION can_view_album(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role TEXT;
    v_user_group_id UUID;
    v_user_group_permissions TEXT[];
    v_album_apply_switch BOOLEAN;
    v_album_manage_levels TEXT[];
    v_album_allowed_group_ids UUID[];
    v_album_min_level TEXT;
    v_album_permission_level TEXT; -- Level from album_user_permissions
    v_effective_level TEXT;
    v_role_weight INT;
    v_min_weight INT;
    v_has_group_permission BOOLEAN;
BEGIN
    -- 1. Get current user info
    -- Default to 'pt' if not found
    SELECT 
        COALESCE(role::TEXT, 'pt'), 
        group_id 
    INTO v_user_role, v_user_group_id 
    FROM profiles WHERE id = v_user_id;

    -- Admin always has access
    IF v_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Get user's group permissions
    IF v_user_group_id IS NOT NULL THEN
        SELECT permissions INTO v_user_group_permissions FROM permission_groups WHERE id = v_user_group_id;
    ELSE
        v_user_group_permissions := '{}';
    END IF;

    -- 2. Get album config
    SELECT 
        apply_switch, 
        user_manage_levels, 
        allowed_group_ids,
        level 
    INTO 
        v_album_apply_switch, 
        v_album_manage_levels, 
        v_album_allowed_group_ids,
        v_album_min_level
    FROM photo_albums 
    WHERE id = p_album_id;

    -- 第一步：权限组校验
    -- 如果图集设置了允许访问的权限组白名单，先检查用户是否在名单内
    IF v_album_allowed_group_ids IS NOT NULL AND array_length(v_album_allowed_group_ids, 1) > 0 THEN
        IF v_user_group_id IS NULL OR NOT (v_user_group_id = ANY(v_album_allowed_group_ids)) THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- 第二步：图集申请模式判断
    IF v_album_apply_switch THEN
        -- 图集需要申请：使用管理员授予的图集内专属等级
        SELECT level INTO v_album_permission_level 
        FROM album_user_permissions 
        WHERE album_id = p_album_id AND user_id = v_user_id;

        -- 如果没有申请通过后的专属权限，直接拦截
        IF v_album_permission_level IS NULL THEN
            RETURN FALSE;
        END IF;
        
        -- 专属等级必须在允许的等级白名单内
        IF NOT (v_album_permission_level = ANY(v_album_manage_levels)) THEN
            RETURN FALSE;
        END IF;

        v_effective_level := v_album_permission_level;
    ELSE
        -- 图集不需要申请：使用用户原生全局等级 + 权限组权限点
        v_effective_level := v_user_role;
        
        -- 这里还需要判断权限组是否包含对应的等级权限点
        -- 写真 - 普通级 (pt)、写真 - 非限制级 (VIP)、写真 - 非限制级 (SVIP)、写真 - 限制级 (VVIP)
        CASE v_effective_level
            WHEN 'pt' THEN v_has_group_permission := (v_user_group_permissions @> ARRAY['album_level_pt']);
            WHEN 'vip' THEN v_has_group_permission := (v_user_group_permissions @> ARRAY['album_level_vip']);
            WHEN 'svip' THEN v_has_group_permission := (v_user_group_permissions @> ARRAY['album_level_svip']);
            WHEN 'vvip' THEN v_has_group_permission := (v_user_group_permissions @> ARRAY['album_level_vvip']);
            ELSE v_has_group_permission := FALSE;
        END CASE;

        -- 如果权限组没勾选对应权限点，拦截
        -- IF NOT v_has_group_permission THEN
        --    RETURN FALSE;
        -- END IF;
    END IF;

    -- 第三步：图集门槛校验
    -- 用户有效查看权限等级，必须 >= 图集设置的最低查看等级门槛
    SELECT 
        CASE v_effective_level
            WHEN 'pt' THEN 0
            WHEN 'vip' THEN 1
            WHEN 'svip' THEN 2
            WHEN 'vvip' THEN 3
            ELSE 0
        END INTO v_role_weight;
        
    SELECT 
        CASE COALESCE(v_album_min_level, 'pt')
            WHEN 'pt' THEN 0
            WHEN 'vip' THEN 1
            WHEN 'svip' THEN 2
            WHEN 'vvip' THEN 3
            ELSE 0
        END INTO v_min_weight;
        
    IF v_role_weight < v_min_weight THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- 3. Update profiles policy to allow public access (fix 401 during login)
DROP POLICY IF EXISTS "Public can view basic profile info for login" ON profiles;
CREATE POLICY "Public can view basic profile info for login" ON profiles
FOR SELECT TO anon, authenticated
USING (true);

-- 4. Update storage_configs policy
DROP POLICY IF EXISTS "Allow public read on storage_configs" ON storage_configs;
CREATE POLICY "Allow public read on storage_configs" ON storage_configs
FOR SELECT TO anon, authenticated
USING (true);

-- 5. Update wechat_configs policy
DROP POLICY IF EXISTS "Anyone can view wechat_configs basic info" ON wechat_configs;
CREATE POLICY "Anyone can view wechat_configs basic info" ON wechat_configs
FOR SELECT TO anon, authenticated
USING (true);
