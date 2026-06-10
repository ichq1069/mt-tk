-- 再次处理 ad_unlock_logs 表中以 8 位数字开头且不含连字符的 item_id
UPDATE ad_unlock_logs
SET item_id = CONCAT(
  SUBSTRING(item_id, 1, 4), '-',
  SUBSTRING(item_id, 5, 2), '-',
  SUBSTRING(item_id, 7, 2)
)
WHERE item_id ~ '^\d{8}[A-Z0-9]*$' AND item_id NOT LIKE '%-%';

-- 再次处理 daily_gallery_access_logs 表中以 8 位数字开头且不含连字符的 publish_date
UPDATE daily_gallery_access_logs
SET publish_date = CONCAT(
  SUBSTRING(publish_date, 1, 4), '-',
  SUBSTRING(publish_date, 5, 2), '-',
  SUBSTRING(publish_date, 7, 2)
)
WHERE publish_date ~ '^\d{8}[A-Z0-9]*$' AND publish_date NOT LIKE '%-%';