ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS tags text[];
COMMENT ON COLUMN album_photos.tags IS '照片标签，用于过滤和分类，例如：🏷️不入微信草稿库';