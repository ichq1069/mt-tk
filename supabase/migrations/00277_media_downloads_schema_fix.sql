-- 先删除旧的外键约束
ALTER TABLE media_downloads DROP CONSTRAINT IF EXISTS media_downloads_album_id_fkey;

-- 重新增加字段描述其含义：对于 wallpaper 类型，media_id 为 media_items.id；对于 album 类型，album_id 为 album_photos.id
-- 为 album_id 增加到 album_photos 的外键约束
-- 这里的 album_id 实际上是指 album_photos.id，因为我们是单张下载
ALTER TABLE media_downloads ADD CONSTRAINT media_downloads_album_id_fkey FOREIGN KEY (album_id) REFERENCES album_photos(id);
