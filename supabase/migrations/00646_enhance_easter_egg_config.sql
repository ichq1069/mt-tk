ALTER TABLE public.easter_egg_configs 
ADD COLUMN IF NOT EXISTS page_paths text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stay_duration integer DEFAULT 0;

COMMENT ON COLUMN public.easter_egg_configs.page_paths IS '允许出现的页面路径列表，为空表示全站';
COMMENT ON COLUMN public.easter_egg_configs.stay_duration IS '停留触发时长（秒）';
