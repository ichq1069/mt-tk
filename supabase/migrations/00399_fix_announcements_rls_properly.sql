-- 确保 is_admin 函数能处理所有管理角色
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND (p.role::text = 'admin' OR p.role::text = 'super_admin')
  );
$function$;

-- 修复 announcements 表的 RLS 策略，确保 INSERT 操作能通过检查
DROP POLICY IF EXISTS "Admins have full access to announcements" ON public.announcements;
CREATE POLICY "Admins have full access to announcements"
  ON public.announcements 
  FOR ALL
  TO authenticated
  USING (is_admin(uid()))
  WITH CHECK (is_admin(uid()));

-- 确保 grant 权限
GRANT ALL ON public.announcements TO authenticated;
