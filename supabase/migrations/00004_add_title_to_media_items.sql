-- 为 media_items 增加标题字段
ALTER TABLE public.media_items ADD COLUMN title text;

-- 更新现有数据的标题（可选）
UPDATE public.media_items SET title = '未命名作品' WHERE title IS NULL;
