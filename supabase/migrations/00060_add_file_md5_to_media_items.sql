-- 添加 file_md5 字段用于文件去重
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS file_md5 TEXT;

-- 创建索引以加快查询速度
CREATE INDEX IF NOT EXISTS idx_media_items_file_md5 ON media_items(file_md5) WHERE file_md5 IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN media_items.file_md5 IS '文件MD5哈希值，用于去重检测';