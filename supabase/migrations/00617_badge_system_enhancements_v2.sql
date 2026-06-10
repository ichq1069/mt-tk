-- 允许通过 RPC 手动触发勋章检查
CREATE OR REPLACE FUNCTION public.check_user_badges(p_user_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM public.check_and_grant_auto_badges(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
