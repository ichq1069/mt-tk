
-- 为现有的 NULL 值设置默认值
UPDATE media_items SET tags = '{}' WHERE tags IS NULL;

-- 设置默认值并改为不可为空
ALTER TABLE media_items ALTER COLUMN tags SET DEFAULT '{}';
ALTER TABLE media_items ALTER COLUMN tags SET NOT NULL;
