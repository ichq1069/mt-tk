-- 为 media_items 表添加索引以优化主页查询
CREATE INDEX IF NOT EXISTS media_items_status_idx ON public.media_items (status);
CREATE INDEX IF NOT EXISTS media_items_created_at_idx ON public.media_items (created_at DESC);
CREATE INDEX IF NOT EXISTS media_items_user_id_idx ON public.media_items (user_id);
CREATE INDEX IF NOT EXISTS media_items_type_idx ON public.media_items (type);

-- 为 favorites 表添加索引以优化查询
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS favorites_media_id_idx ON public.favorites (media_id);

-- 为 dislikes 表添加索引以优化查询
CREATE INDEX IF NOT EXISTS dislikes_user_id_idx ON public.dislikes (user_id);
CREATE INDEX IF NOT EXISTS dislikes_media_id_idx ON public.dislikes (media_id);
