ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS file_md5 text;
ALTER TABLE album_photos ADD COLUMN IF NOT EXISTS content_hash text;
CREATE INDEX IF NOT EXISTS idx_album_photos_dedupe ON album_photos (album_id, file_md5, content_hash);
COMMENT ON COLUMN album_photos.file_md5 IS '图片文件的 MD5 哈希值，用于图集内文件查重';
COMMENT ON COLUMN album_photos.content_hash IS '图片内容的视觉哈希值，用于图集内相似度查重';
