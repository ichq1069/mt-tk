-- 为 zonerama_library 表添加定级字段
ALTER TABLE public.zonerama_library 
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);

-- 添加注释
COMMENT ON COLUMN public.zonerama_library.rating IS '图片评级（0-5星，0表示未评级）';