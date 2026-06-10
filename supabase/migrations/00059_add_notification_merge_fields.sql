-- 为通知表添加合并相关字段
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS media_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS merge_key TEXT;

-- 添加索引以提升合并通知查询性能
CREATE INDEX IF NOT EXISTS idx_notifications_merge_key ON notifications(user_id, merge_key, created_at DESC) WHERE is_read = false;

-- 添加注释
COMMENT ON COLUMN notifications.count IS '合并的通知数量';
COMMENT ON COLUMN notifications.media_ids IS '相关作品ID列表（JSON数组）';
COMMENT ON COLUMN notifications.merge_key IS '合并键，用于识别可合并的通知类型（如：audit_approved, audit_rejected）';
