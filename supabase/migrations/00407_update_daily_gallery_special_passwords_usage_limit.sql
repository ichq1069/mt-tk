-- 添加最大使用次数和已使用次数
ALTER TABLE daily_gallery_special_passwords 
ADD COLUMN IF NOT EXISTS max_usages INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;

-- 迁移旧的 is_one_time 数据到 max_usages
-- 如果 is_one_time 为 true，则 max_usages = 1
-- 如果 is_one_time 为 false 或 null，则设置一个很大的数代表不限次数，或者就保持为某个默认值
-- 为了符合用户需求，我们将 is_one_time 转化为 max_usages
UPDATE daily_gallery_special_passwords 
SET max_usages = 1 
WHERE is_one_time = true;

UPDATE daily_gallery_special_passwords 
SET max_usages = 999999 
WHERE is_one_time = false OR is_one_time IS NULL;

-- 同时也迁移 used_count
UPDATE daily_gallery_special_passwords 
SET used_count = 1 
WHERE is_used = true;
