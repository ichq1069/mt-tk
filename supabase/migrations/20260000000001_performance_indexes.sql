-- 性能优化：为高频查询字段添加索引

-- media_items 表索引优化
CREATE INDEX IF NOT EXISTS idx_media_items_user_id_created_at ON media_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_status_created_at ON media_items(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_category_id ON media_items(category_id);
CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_deleted_at ON media_items(deleted_at) WHERE deleted_at IS NOT NULL;

-- favorites 表索引优化
CREATE INDEX IF NOT EXISTS idx_favorites_user_id_created_at ON favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_media_id ON favorites(media_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_media ON favorites(user_id, media_id);

-- media_tags 表索引优化
CREATE INDEX IF NOT EXISTS idx_media_tags_media_id ON media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tag_id ON media_tags(tag_id);

-- profiles 表索引优化
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- notifications 表索引优化
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- check_ins 表索引优化
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id_date ON check_ins(user_id, check_in_date DESC);

-- points_logs 表索引优化
CREATE INDEX IF NOT EXISTS idx_points_logs_user_id_created_at ON points_logs(user_id, created_at DESC);

-- reports 表索引优化
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_media_id ON reports(media_id);

-- photo_albums 表索引优化
CREATE INDEX IF NOT EXISTS idx_photo_albums_user_id ON photo_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_albums_created_at ON photo_albums(created_at DESC);

-- album_photos 表索引优化
CREATE INDEX IF NOT EXISTS idx_album_photos_album_id ON album_photos(album_id);
CREATE INDEX IF NOT EXISTS idx_album_photos_sort_order ON album_photos(album_id, sort_order);

COMMENT ON INDEX idx_media_items_user_id_created_at IS '优化用户媒体列表查询';
COMMENT ON INDEX idx_media_items_status_created_at IS '优化审核列表查询';
COMMENT ON INDEX idx_favorites_user_media IS '优化收藏状态检查';
