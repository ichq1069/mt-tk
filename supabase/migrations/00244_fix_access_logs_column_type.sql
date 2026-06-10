-- 修改 publish_date 字段类型为 TEXT，以便处理不带连字符的日期字符串
ALTER TABLE daily_gallery_access_logs 
ALTER COLUMN publish_date TYPE TEXT;

-- 确保 ad_unlock_logs 允许新的 watch_status 枚举值（通过 CHECK 约束实现）
ALTER TABLE ad_unlock_logs 
DROP CONSTRAINT IF EXISTS ad_unlock_logs_watch_status_check;

ALTER TABLE ad_unlock_logs 
ADD CONSTRAINT ad_unlock_logs_watch_status_check 
CHECK (watch_status IN ('ad_clicked', 'watching', 'exited_incomplete', 'completed', 'completed_and_clicked', 'incomplete_and_clicked'));