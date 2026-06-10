-- 修改 zonerama_library 表的 status 字段，添加 recycled 和 blacklisted 状态
ALTER TABLE public.zonerama_library 
DROP CONSTRAINT IF EXISTS zonerama_library_status_check;

ALTER TABLE public.zonerama_library 
ADD CONSTRAINT zonerama_library_status_check 
CHECK (status IN ('pending', 'transferred_to_wallpaper', 'transferred_to_album', 'recycled', 'blacklisted'));

-- 更新注释
COMMENT ON COLUMN public.zonerama_library.status IS '图片状态（pending=待处理, transferred_to_wallpaper=已转壁纸, transferred_to_album=已转图集, recycled=回收站, blacklisted=黑名单）';