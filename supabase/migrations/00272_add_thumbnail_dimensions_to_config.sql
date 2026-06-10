ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS thumbnail_width INTEGER,
ADD COLUMN IF NOT EXISTS thumbnail_height INTEGER;

COMMENT ON COLUMN storage_configs.thumbnail_width IS '全局缩略图宽度设置';
COMMENT ON COLUMN storage_configs.thumbnail_height IS '全局缩略图高度设置';
