-- 修复公告表 RLS 策略
-- 问题：原策略限制 (is_active = true)，有时与前端多重查询条件合并时会导致 PostgREST 400 错误
DROP POLICY IF EXISTS "任何人可查看激活的公告" ON public.announcements;

-- 任何人都可以读取公告 (具体的激活过滤交给前端或使用更简洁的 SQL)
CREATE POLICY "Allow anyone to read announcements" 
  ON public.announcements FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- 确保管理员权限正常
DROP POLICY IF EXISTS "管理员全权管理公告" ON public.announcements;
CREATE POLICY "Admins have full access to announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (is_admin(uid()));

-- 授权权限
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO authenticated;
