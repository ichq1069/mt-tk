-- 为 miniprogram_configs 表添加公开读取策略
CREATE POLICY "Anyone can read miniprogram_configs" ON miniprogram_configs
  FOR SELECT USING (true);
