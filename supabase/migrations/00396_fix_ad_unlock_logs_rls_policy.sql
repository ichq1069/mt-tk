-- 修复 ad_unlock_logs 表的 RLS 策略
-- 问题：原策略中的 (openid = openid) 是一个恒真表达式，可能导致 PostgREST 解析错误

-- 1. 删除旧的 SELECT 策略
DROP POLICY IF EXISTS "Users can view their own ad_unlock_logs" ON public.ad_unlock_logs;

-- 2. 创建新的 SELECT 策略（允许所有用户查看所有解锁记录）
-- 因为这是匿名解锁日志，不包含敏感信息，所以允许公开访问
CREATE POLICY "Anyone can view ad_unlock_logs"
  ON public.ad_unlock_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. 确保 anon 和 authenticated 角色有 SELECT 和 INSERT 权限
GRANT SELECT, INSERT ON public.ad_unlock_logs TO anon, authenticated;