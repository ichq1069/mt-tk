ALTER TABLE public.storage_configs 
ADD COLUMN IF NOT EXISTS bg_music_url text,
ADD COLUMN IF NOT EXISTS bg_music_volume double precision DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS bg_music_title text DEFAULT '轻音乐模式';