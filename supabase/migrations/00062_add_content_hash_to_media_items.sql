-- 为 media_items 添加内容哈希字段，用于视觉查重
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 创建索引以加快视觉查重搜索
CREATE INDEX IF NOT EXISTS idx_media_items_content_hash ON media_items(content_hash) WHERE content_hash IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN media_items.content_hash IS '图片内容视觉哈希值（Perceptual Hash），用于识别视觉相似图片';