ALTER TABLE album_photo_level_logs ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES auth.users(id);
-- Also ensure album_photo_level_logs has some helpful indexes
CREATE INDEX IF NOT EXISTS idx_album_photo_level_logs_photo_id ON album_photo_level_logs(photo_id);
CREATE INDEX IF NOT EXISTS idx_album_photo_level_logs_operator_id ON album_photo_level_logs(operator_id);
