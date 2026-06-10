ALTER TABLE public.daily_gallery_special_passwords ADD COLUMN IF NOT EXISTS reset_count int4 DEFAULT 0;
ALTER TABLE public.daily_gallery_special_passwords ADD COLUMN IF NOT EXISTS creator_id text;
-- 确保 creator_id 和 target_date 有索引，方便重置逻辑查询
CREATE INDEX IF NOT EXISTS idx_special_passwords_creator_date ON public.daily_gallery_special_passwords (creator_id, target_date);
