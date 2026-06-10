-- Fix operator ambiguity for public.item_status by changing IMPLICIT casts to ASSIGNMENT
-- This prevents the "operator is not unique" error when comparing public.item_status values
DO $$
BEGIN
    -- Change text -> public.item_status cast to ASSIGNMENT
    IF EXISTS (SELECT 1 FROM pg_cast WHERE castsource = 'text'::regtype AND casttarget = 'public.item_status'::regtype AND castcontext = 'i') THEN
        DROP CAST (text AS public.item_status);
        CREATE CAST (text AS public.item_status) WITH INOUT AS ASSIGNMENT;
    END IF;
    
    -- Change public.item_status -> text cast to ASSIGNMENT
    IF EXISTS (SELECT 1 FROM pg_cast WHERE castsource = 'public.item_status'::regtype AND casttarget = 'text'::regtype AND castcontext = 'i') THEN
        DROP CAST (public.item_status AS text);
        CREATE CAST (public.item_status AS text) WITH INOUT AS ASSIGNMENT;
    END IF;
END $$;

-- Also standardize existing usage in helper functions with explicit schema qualification
CREATE OR REPLACE FUNCTION public.can_view_album(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_role public.user_role;
    v_apply_switch BOOLEAN;
    v_manage_levels TEXT[];
    v_permission_levels TEXT[];
    v_is_admin BOOLEAN;
    v_has_request_approved BOOLEAN;
BEGIN
    -- Get current user role with explicit type
    SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();
    
    -- If user is admin, allow
    IF v_user_role = 'admin'::public.user_role THEN
        RETURN TRUE;
    END IF;

    -- Get album config with explicit table name qualification
    SELECT photo_albums.apply_switch, photo_albums.user_manage_levels, photo_albums.permission_levels 
    INTO v_apply_switch, v_manage_levels, v_permission_levels 
    FROM public.photo_albums WHERE photo_albums.id = p_album_id;

    IF v_apply_switch THEN
        -- Check if request is approved with explicit type and table name
        SELECT EXISTS (
            SELECT 1 FROM public.photo_album_requests 
            WHERE photo_album_requests.album_id = p_album_id 
              AND photo_album_requests.user_id = auth.uid() 
              AND photo_album_requests.status = 'approved'::public.item_status  -- 这里修复了！
        ) INTO v_has_request_approved;
        
        IF NOT v_has_request_approved THEN
            RETURN FALSE;
        END IF;
        
        -- Check if user level is allowed in this album
        RETURN (v_user_role::TEXT = ANY(v_manage_levels));
    ELSE
        -- Fallback to standard permission group/level check
        RETURN (v_user_role::TEXT = ANY(v_permission_levels));
    END IF;
END;
$$;
