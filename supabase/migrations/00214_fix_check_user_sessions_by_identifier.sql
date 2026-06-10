-- Recreate the function to ensure it's in the schema cache
CREATE OR REPLACE FUNCTION public.check_user_sessions_by_identifier(p_identifier text)
 RETURNS TABLE(user_id uuid, has_active_session boolean, security_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    target_user_id UUID;
    v_security_status TEXT;
BEGIN
    -- 先根据 identifier 找到 user_id 和 security_status
    -- 尝试通过 username, email, 或者 mobile 查找
    SELECT p.id, p.security_status INTO target_user_id, v_security_status
    FROM public.profiles p
    WHERE p.username = p_identifier 
       OR p.email = p_identifier 
       OR p.mobile = p_identifier
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RETURN;
    END IF;

    -- 返回结果
    RETURN QUERY
    SELECT 
        target_user_id,
        EXISTS (
            SELECT 1 FROM public.user_active_sessions 
            WHERE user_id = target_user_id 
              AND is_active = TRUE 
              AND last_ping_at > NOW() - INTERVAL '15 minutes'
        ),
        COALESCE(v_security_status, 'normal');
END;
$function$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.check_user_sessions_by_identifier(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_sessions_by_identifier(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_sessions_by_identifier(text) TO service_role;
