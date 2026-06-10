-- 5. Helper function for album access check
CREATE OR REPLACE FUNCTION can_view_album(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_role user_role;
    v_apply_switch BOOLEAN;
    v_manage_levels TEXT[];
    v_permission_levels TEXT[];
    v_is_admin BOOLEAN;
    v_has_request_approved BOOLEAN;
BEGIN
    -- Get current user role
    SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
    
    -- If user is admin, allow
    IF v_user_role = 'admin'::user_role THEN
        RETURN TRUE;
    END IF;

    -- Get album config
    SELECT apply_switch, user_manage_levels, permission_levels 
    INTO v_apply_switch, v_manage_levels, v_permission_levels 
    FROM photo_albums WHERE id = p_album_id;

    IF v_apply_switch THEN
        -- Check if request is approved
        SELECT EXISTS (
            SELECT 1 FROM photo_album_requests 
            WHERE album_id = p_album_id AND user_id = auth.uid() AND status::public.item_status = 'approved'::public.item_status
        ) INTO v_has_request_approved;
        
        IF NOT v_has_request_approved THEN
            RETURN FALSE;
        END IF;
        
        -- Check if user level is allowed in this album
        RETURN (v_user_role::TEXT = ANY(v_manage_levels));
    ELSE
        -- Fallback to standard permission group/level check
        -- Note: permission_levels in photo_albums is TEXT[] currently
        RETURN (v_user_role::TEXT = ANY(v_permission_levels));
    END IF;
END;
$$;
