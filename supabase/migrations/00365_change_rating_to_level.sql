-- 删除 rating 字段，添加 level 字段
ALTER TABLE public.zonerama_library 
DROP COLUMN IF EXISTS rating;

ALTER TABLE public.zonerama_library 
ADD COLUMN level TEXT DEFAULT 'PT' CHECK (level IN ('PT', 'VIP', 'SVIP', 'VVIP'));

-- 添加注释
COMMENT ON COLUMN public.zonerama_library.level IS '图片等级（PT、VIP、SVIP、VVIP）';