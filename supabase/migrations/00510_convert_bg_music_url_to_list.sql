ALTER TABLE public.storage_configs 
ADD COLUMN IF NOT EXISTS bg_music_list jsonb DEFAULT '[]'::jsonb;

-- 数据迁移：将单条配置迁移到列表中
UPDATE public.storage_configs 
SET bg_music_list = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid(),
    'url', bg_music_url,
    'title', bg_music_title
  )
)
WHERE bg_music_url IS NOT NULL AND (bg_music_list IS NULL OR bg_music_list = '[]'::jsonb);