-- 为 media_items 添加去重错误原因字段
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS dedupe_error TEXT;

-- 添加注释
COMMENT ON COLUMN media_items.dedupe_error IS '去重扫描（指纹提取）失败的原因';

-- 创建索引以加快过滤
CREATE INDEX IF NOT EXISTS idx_media_items_dedupe_error ON media_items(dedupe_error) WHERE dedupe_error IS NOT NULL;