-- 为 media_items 表添加 zonerama_photo_id 字段，用于记录 Zonerama 图片 ID，避免重复导入
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS zonerama_photo_id TEXT;

-- 为 zonerama_photo_id 字段创建索引，提升查询性能
CREATE INDEX IF NOT EXISTS idx_media_items_zonerama_photo_id ON media_items(zonerama_photo_id);

-- 添加注释
COMMENT ON COLUMN media_items.zonerama_photo_id IS 'Zonerama 图片 ID，用于避免重复导入';
