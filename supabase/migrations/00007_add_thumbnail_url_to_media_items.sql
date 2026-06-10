-- 为 media_items 表添加缩略图字段
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 更新 RLS 策略（如果需要，由于之前是 ALL 或 SELECT *，通常不需要额外修改，但确认为安全）
COMMENT ON COLUMN public.media_items.thumbnail_url IS '视频或图片的缩略图地址';
