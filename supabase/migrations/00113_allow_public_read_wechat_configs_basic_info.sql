-- 允许所有人读取公众号的基础信息（用于登录页展示）
CREATE POLICY "Anyone can view wechat_configs basic info" ON wechat_configs
  FOR SELECT USING (true);
