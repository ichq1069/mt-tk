-- 创建不喜欢记录表
CREATE TABLE IF NOT EXISTS public.dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, media_id)
);

-- 为 profiles 增加封禁状态
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- 开启 RLS
ALTER TABLE public.dislikes ENABLE ROW LEVEL SECURITY;

-- 权限策略
CREATE POLICY "Users can manage their own dislikes" ON public.dislikes
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 更新随机媒体函数，支持排除已收藏和已不喜欢的项
-- 注意：为了性能，我们通过应用层传入排除列表，或者在这里通过 user_id 关联
CREATE OR REPLACE FUNCTION get_filtered_random_media(limit_count int, current_user_id uuid)
RETURNS SETOF media_items AS $$
BEGIN
  RETURN QUERY 
  SELECT m.* 
  FROM media_items m
  WHERE m.status::public.item_status = 'approved'::public.item_status 
    AND m.id NOT IN (SELECT media_id FROM favorites WHERE user_id = current_user_id)
    AND m.id NOT IN (SELECT media_id FROM dislikes WHERE user_id = current_user_id)
  ORDER BY random() 
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
