-- 第三步：添加新约束和默认值
ALTER TABLE public.zonerama_library 
ALTER COLUMN level SET DEFAULT 'pending'::public.item_status;

ALTER TABLE public.zonerama_library 
ADD CONSTRAINT zonerama_library_level_check 
CHECK (level IN ('pending', 'normal', 'vip', 'svip', 'restricted'));

-- 更新注释
COMMENT ON COLUMN public.zonerama_library.level IS '图片等级（pending=待定, normal=普通, vip=VIP, svip=SVIP, restricted=受限）';