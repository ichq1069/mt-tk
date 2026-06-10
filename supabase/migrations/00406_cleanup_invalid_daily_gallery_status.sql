-- 清理无效的每日图集状态数据
-- 将所有已删除、非图片、被拒绝、被隐藏、被排除的 unused/pending 数据的 daily_gallery_status 设置为 NULL

UPDATE media_items
SET daily_gallery_status = NULL
WHERE daily_gallery_status IN ('unused', 'pending')
  AND (
    deleted_at IS NOT NULL OR
    type != 'image' OR
    status NOT IN ('approved') OR
    is_hidden = true OR
    exclude_from_daily_gallery = true
  );

-- 添加注释说明
COMMENT ON COLUMN media_items.daily_gallery_status IS '每日图集状态：unused(待使用)、pending(待发布)、used(已使用)。仅对 approved、未删除、未隐藏、未排除的图片有效';