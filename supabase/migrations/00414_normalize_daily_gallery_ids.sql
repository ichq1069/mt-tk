-- 标准化 ad_unlock_logs 表中的 item_id (将 YYYYMMDD 转换为 YYYY-MM-DD)
UPDATE ad_unlock_logs
SET item_id = CONCAT(
  SUBSTRING(item_id, 1, 4), '-',
  SUBSTRING(item_id, 5, 2), '-',
  SUBSTRING(item_id, 7, 2)
)
WHERE item_id ~ '^\d{8}$';

-- 标准化 daily_gallery_access_logs 表中的 publish_date
-- 处理 YYYYMMDD 格式
UPDATE daily_gallery_access_logs
SET publish_date = CONCAT(
  SUBSTRING(publish_date, 1, 4), '-',
  SUBSTRING(publish_date, 5, 2), '-',
  SUBSTRING(publish_date, 7, 2)
)
WHERE publish_date ~ '^\d{8}$';

-- 处理 YYYYMMDD_XXXX 格式 (去除后缀)
UPDATE daily_gallery_access_logs
SET publish_date = CONCAT(
  SUBSTRING(publish_date, 1, 4), '-',
  SUBSTRING(publish_date, 5, 2), '-',
  SUBSTRING(publish_date, 7, 2)
)
WHERE publish_date ~ '^\d{8}_';

-- 处理 ad_unlock_logs 中的 YYYYMMDD_XXXX 格式
UPDATE ad_unlock_logs
SET item_id = CONCAT(
  SUBSTRING(item_id, 1, 4), '-',
  SUBSTRING(item_id, 5, 2), '-',
  SUBSTRING(item_id, 7, 2)
)
WHERE item_id ~ '^\d{8}_';