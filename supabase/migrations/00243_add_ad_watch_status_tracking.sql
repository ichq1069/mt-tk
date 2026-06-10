-- 为 ad_unlock_logs 表添加广告观看状态追踪字段
ALTER TABLE ad_unlock_logs 
ADD COLUMN IF NOT EXISTS watch_status TEXT CHECK (watch_status IN ('ad_clicked', 'watching', 'exited_incomplete', 'completed', 'completed_and_clicked', 'incomplete_and_clicked'));

-- 添加注释说明
COMMENT ON COLUMN ad_unlock_logs.watch_status IS '广告观看状态：ad_clicked=点击广告, watching=观看中, exited_incomplete=未完整观看已退出, completed=已完整观看, completed_and_clicked=已完整观看并点击了广告, incomplete_and_clicked=未完整观看并点击了广告';

-- 为 daily_gallery_access_logs 表修正字段名称，使其与 Edge Function 匹配
ALTER TABLE daily_gallery_access_logs 
ADD COLUMN IF NOT EXISTS publish_date DATE,
ADD COLUMN IF NOT EXISTS openid TEXT,
ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'view';

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_ad_unlock_logs_watch_status ON ad_unlock_logs(watch_status);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_publish_date ON daily_gallery_access_logs(publish_date);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_openid ON daily_gallery_access_logs(openid);