-- 允许匿名和已认证用户查询访客统计（用于 .insert().select() 返回数据）
DROP POLICY IF EXISTS "Anyone can select visit stats" ON user_visit_stats;
CREATE POLICY "Anyone can select visit stats" ON user_visit_stats FOR SELECT TO anon, authenticated USING (true);
