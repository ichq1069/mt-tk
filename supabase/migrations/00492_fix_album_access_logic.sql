
-- Drop unnecessary table
DROP TABLE IF EXISTS photo_album_requests;

-- Update can_view_album function
CREATE OR REPLACE FUNCTION can_view_album(p_album_id UUID)
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
    v_album_permission_group_id UUID;
    v_album_level TEXT;
    v_album_permission_level TEXT; -- Level from album_user_permissions
    v_effective_level TEXT;
    v_role_weight INT;
    v_req_weight INT;
BEGIN
    -- 1. Get current user info
    SELECT role::TEXT, group_id INTO v_user_role, v_user_group_id FROM profiles WHERE id = v_user_id;
    
    -- Admin always has access
    IF v_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 2. Get album config
    SELECT 
        apply_switch, 
        user_manage_levels, 
        permission_group_id,
        level 
    INTO 
        v_album_apply_switch, 
        v_album_manage_levels, 
        v_album_permission_group_id,
        v_album_level
    FROM photo_albums 
    WHERE id = p_album_id;

    -- 3. Get specific permission for this user and album
    SELECT level INTO v_album_permission_level 
    FROM album_user_permissions 
    WHERE album_id = p_album_id AND user_id = v_user_id;

    -- 4. Logic based on apply_switch
    IF v_album_apply_switch THEN
        -- If application is required, user MUST have a specific permission entry
        IF v_album_permission_level IS NULL THEN
            RETURN FALSE;
        END IF;
        
        -- And their specific level MUST be in the allowed management levels
        RETURN (v_album_permission_level = ANY(v_album_manage_levels));
    ELSE
        -- Standard logic: use specific level if exists, otherwise global role
        v_effective_level := COALESCE(v_album_permission_level, v_user_role);
        
        -- Check if user's effective level meets the album's level requirement
        -- Define weights for levels
        -- pt=0, vip=1, svip=2, vvip=3
        SELECT 
            CASE v_effective_level
                WHEN 'pt' THEN 0
                WHEN 'vip' THEN 1
                WHEN 'svip' THEN 2
                WHEN 'vvip' THEN 3
                ELSE 0
            END INTO v_role_weight;
            
        SELECT 
            CASE v_album_level
                WHEN 'pt' THEN 0
                WHEN 'vip' THEN 1
                WHEN 'svip' THEN 2
                WHEN 'vvip' THEN 3
                ELSE 0
            END INTO v_req_weight;
            
        IF v_role_weight < v_req_weight THEN
            RETURN FALSE;
        END IF;

        -- Check permission group constraint
        -- If album has a permission group requirement, user must belong to that group
        -- BUT if they have a specific album permission level > pt, we allow it (as per user's "final decider" rule)
        IF v_album_permission_group_id IS NOT NULL THEN
            IF v_album_permission_level IS NOT NULL AND v_role_weight > 0 THEN
                RETURN TRUE;
            END IF;
            
            IF v_user_group_id IS NULL OR v_user_group_id != v_album_permission_group_id THEN
                -- Check if user's group is a child of the required group or has higher priority? 
                -- For simplicity, exact match or admin. 
                -- Actually, let's just check exact match for now as per current system.
                RETURN FALSE;
            END IF;
        END IF;
        
        RETURN TRUE;
    END IF;
END;
$$;
