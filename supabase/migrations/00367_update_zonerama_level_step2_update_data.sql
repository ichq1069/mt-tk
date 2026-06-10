-- 第二步：更新现有数据
UPDATE public.zonerama_library
SET level = CASE 
  WHEN level = 'PT' THEN 'pending'
  WHEN level = 'VIP' THEN 'vip'
  WHEN level = 'SVIP' THEN 'svip'
  WHEN level = 'VVIP' THEN 'svip'
  ELSE 'pending'
END
WHERE level IN ('PT', 'VIP', 'SVIP', 'VVIP');