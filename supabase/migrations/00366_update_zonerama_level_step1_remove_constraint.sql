-- 第一步：删除旧约束
ALTER TABLE public.zonerama_library 
DROP CONSTRAINT IF EXISTS zonerama_library_level_check;