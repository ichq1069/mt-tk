-- 修改 album_photos 表的 level 默认值为 'pending'
ALTER TABLE public.album_photos ALTER COLUMN level SET DEFAULT 'pending'::public.item_status;

-- 更新约束
ALTER TABLE public.album_photos DROP CONSTRAINT IF EXISTS album_photos_level_check;
ALTER TABLE public.album_photos ADD CONSTRAINT album_photos_level_check CHECK (level IN ('pending', 'normal', 'vip', 'svip', 'restricted'));

-- 同时也更新日志表的约束（如果有的话）
ALTER TABLE public.album_photo_level_logs DROP CONSTRAINT IF EXISTS album_photo_level_logs_new_level_check;
-- 如果是 text 字段且没有明确约束，就不加了。
