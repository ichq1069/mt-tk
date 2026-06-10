-- 创建 can_manage_media 辅助函数
CREATE OR REPLACE FUNCTION public.can_manage_media(media_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.media_items m
    WHERE m.id = media_id 
    AND (m.user_id = user_id OR public.is_admin(user_id))
  );
$$;

COMMENT ON FUNCTION public.can_manage_media IS '检查用户是否可以管理指定媒体项（所有者或管理员）';