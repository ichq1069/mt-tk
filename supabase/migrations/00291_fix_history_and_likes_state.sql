-- 创建图集浏览历史表，替代 localStorage
CREATE TABLE IF NOT EXISTS public.album_viewing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    album_id UUID NOT NULL REFERENCES public.photo_albums(id) ON DELETE CASCADE,
    last_photo_index INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, album_id)
);

-- 设置 RLS
ALTER TABLE public.album_viewing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own album history"
    ON public.album_viewing_history
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 确保 favorites 表有正确的索引和权限
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_media_id_idx ON public.favorites(media_id);

-- 如果不存在，创建点赞状态查询函数
CREATE OR REPLACE FUNCTION public.check_user_favorites(p_user_id UUID, p_media_ids UUID[])
RETURNS TABLE(media_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT f.media_id
    FROM public.favorites f
    WHERE f.user_id = p_user_id AND f.media_id = ANY(p_media_ids);
END;
$$;
