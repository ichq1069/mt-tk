-- 再次确认 ad_unlock_logs 表权限
GRANT SELECT, INSERT ON public.ad_unlock_logs TO anon, authenticated;

-- 如果 RLS 已启用，确保策略是允许的
DROP POLICY IF EXISTS "Anyone can view ad_unlock_logs" ON public.ad_unlock_logs;
CREATE POLICY "Anyone can view ad_unlock_logs"
  ON public.ad_unlock_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 允许任何人插入，因为它是通过边缘函数或前端公开插入流水
DROP POLICY IF EXISTS "Anyone can insert ad_unlock_logs" ON public.ad_unlock_logs;
CREATE POLICY "Anyone can insert ad_unlock_logs"
  ON public.ad_unlock_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
